import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DisbursementStatus, MismatchStatus, RepaymentScheduleStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminLoginDto, CreateAdminDto, FreezeAccountDto } from './dto/admin.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  // ─── Auth ───────────────────────────────────────────────────────────────────

  async createAdmin(dto: CreateAdminDto) {
    const existing = await this.prisma.adminUser.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Admin with this email already exists');
    const passwordHash = await bcrypt.hash(dto.password, 12);
    return this.prisma.adminUser.create({
      data: { email: dto.email, passwordHash, role: dto.role, permissions: dto.permissions ?? [] },
      select: { id: true, email: true, role: true, permissions: true, active: true, createdAt: true },
    });
  }

  async login(dto: AdminLoginDto, ip?: string) {
    const admin = await this.prisma.adminUser.findUnique({ where: { email: dto.email } });
    if (!admin || !admin.active) throw new UnauthorizedException('Invalid credentials');
    const valid = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    await this.prisma.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
    const token = this.jwt.sign({ adminId: admin.id, role: admin.role }, { expiresIn: '8h' });
    this.logger.log(`Admin login: ${admin.email} from ${ip}`);
    return { token, admin: { id: admin.id, email: admin.email, role: admin.role } };
  }

  // ─── Operations Dashboard ───────────────────────────────────────────────────

  async getDashboard() {
    const [
      totalUsers, activeLoans, overdueSchedules, defaultedLoans,
      totalWalletBalance, openMismatches, highRiskUsers,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.loanDisbursement.count({ where: { status: DisbursementStatus.DISBURSED } }),
      this.prisma.loanRepaymentSchedule.count({ where: { status: RepaymentScheduleStatus.OVERDUE } }),
      this.prisma.loanDisbursement.count({ where: { status: DisbursementStatus.DEFAULTED } }),
      this.prisma.wallet.aggregate({ _sum: { availableBalance: true } }),
      this.prisma.reconciliationMismatch.count({ where: { status: MismatchStatus.OPEN } }),
      this.prisma.economicProfile.count({ where: { riskLevel: { in: ['High', 'Very High'] } } }),
    ]);

    return {
      users: { total: totalUsers, highRisk: highRiskUsers },
      loans: { active: activeLoans, overdue: overdueSchedules, defaulted: defaultedLoans },
      wallets: { totalBalance: totalWalletBalance._sum.availableBalance ?? 0 },
      reconciliation: { openMismatches },
    };
  }

  async getLoanGovernance(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [loans, total] = await Promise.all([
      this.prisma.loanDisbursement.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.loanDisbursement.count(),
    ]);
    return { loans, total, page, limit };
  }

  async getTreasuryOverview() {
    const [wallets, groups] = await Promise.all([
      this.prisma.savingsGroupWallet.findMany({
        select: { groupId: true, availableBalance: true, reserveBalance: true, lendingPoolBalance: true, totalContributions: true },
      }),
      this.prisma.savingsGroup.count(),
    ]);
    const totalTreasury = wallets.reduce((s, w) => s + w.availableBalance + w.reserveBalance, 0);
    const totalLending = wallets.reduce((s, w) => s + w.lendingPoolBalance, 0);
    return { groups, totalTreasury, totalLending, wallets };
  }

  async getHighRiskUsers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [profiles, total] = await Promise.all([
      this.prisma.economicProfile.findMany({
        where: { riskLevel: { in: ['High', 'Very High'] } },
        skip, take: limit,
        select: { userId: true, trustScore: true, riskLevel: true, updatedAt: true },
      }),
      this.prisma.economicProfile.count({ where: { riskLevel: { in: ['High', 'Very High'] } } }),
    ]);
    return { profiles, total, page, limit };
  }

  // ─── Account Controls ───────────────────────────────────────────────────────

  async freezeWallet(userId: string, dto: FreezeAccountDto, adminId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');
    await this.prisma.wallet.update({
      where: { userId },
      data: { frozenBalance: wallet.availableBalance, availableBalance: 0 },
    });
    this.logger.warn(`Wallet frozen: user=${userId} by admin=${adminId} reason=${dto.reason}`);
    return { frozen: true, userId, reason: dto.reason };
  }

  async unfreezeWallet(userId: string, adminId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');
    await this.prisma.wallet.update({
      where: { userId },
      data: { availableBalance: wallet.frozenBalance, frozenBalance: 0 },
    });
    this.logger.log(`Wallet unfrozen: user=${userId} by admin=${adminId}`);
    return { unfrozen: true, userId };
  }

  async overrideLoanEligibility(userId: string, eligible: boolean, adminId: string) {
    const record = await this.prisma.loanEligibility.findUnique({ where: { userId } });
    if (!record) throw new NotFoundException('Loan eligibility record not found');
    await this.prisma.loanEligibility.update({
      where: { userId },
      data: { eligible, recommendation: `Admin override by ${adminId}` },
    });
    this.logger.warn(`Loan eligibility overridden: user=${userId} eligible=${eligible} by admin=${adminId}`);
    return { overridden: true, userId, eligible };
  }
}
