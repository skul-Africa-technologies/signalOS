import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly walletService: WalletService,
    private readonly events: EventEmitter2,
  ) {}

  // ─── Signup ───────────────────────────────────────────────────────────────

  async signup(dto: SignupDto, meta?: { ip?: string; userAgent?: string }) {
    const existing = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (existing) throw new ConflictException('Phone number already registered');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { name: dto.name, phone: dto.phone, passwordHash, businessType: dto.businessType },
      select: { id: true, name: true, phone: true, businessType: true, trustScore: true, createdAt: true },
    });

    await this.walletService.getOrCreate(user.id).catch((err) =>
      this.logger.error(`Wallet creation failed for ${user.id}: ${err.message}`),
    );

    const tokens = await this.issueTokens(user.id, user.phone, meta);
    this.events.emit('auth.login', { userId: user.id, ip: meta?.ip });
    return { user, ...tokens };
  }

  // ─── Login ────────────────────────────────────────────────────────────────

  async login(dto: LoginDto, meta?: { ip?: string; userAgent?: string }) {
    const user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const { passwordHash: _, ...profile } = user;
    const tokens = await this.issueTokens(user.id, user.phone, meta);

    this.logger.log(`Login: userId=${user.id} ip=${meta?.ip}`);
    this.events.emit('auth.login', { userId: user.id, ip: meta?.ip });
    return { user: profile, ...tokens };
  }

  // ─── Refresh (with rotation) ──────────────────────────────────────────────

  async refresh(userId: string, rawRefreshToken: string, meta?: { ip?: string; userAgent?: string }) {
    // Find all active sessions for user and check hash match
    const sessions = await this.prisma.refreshSession.findMany({
      where: { userId, revoked: false, expiresAt: { gt: new Date() } },
    });

    let matchedSession: (typeof sessions)[0] | null = null;
    for (const session of sessions) {
      const match = await bcrypt.compare(rawRefreshToken, session.refreshTokenHash);
      if (match) { matchedSession = session; break; }
    }

    if (!matchedSession) {
      // Possible token reuse — revoke all sessions as security measure
      await this.prisma.refreshSession.updateMany({
        where: { userId, revoked: false },
        data: { revoked: true, revokedAt: new Date() },
      });
      this.logger.warn(`Refresh token reuse detected for userId=${userId} — all sessions revoked`);
      this.events.emit('auth.session.revoked', { userId, reason: 'reuse_detected' });
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Revoke old session
    await this.prisma.refreshSession.update({
      where: { id: matchedSession.id },
      data: { revoked: true, revokedAt: new Date() },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    const tokens = await this.issueTokens(userId, user.phone, meta);
    this.events.emit('auth.token.refreshed', { userId, ip: meta?.ip });
    return tokens;
  }

  // ─── Logout ───────────────────────────────────────────────────────────────

  async logout(userId: string, rawRefreshToken: string) {
    const sessions = await this.prisma.refreshSession.findMany({
      where: { userId, revoked: false },
    });

    for (const session of sessions) {
      const match = await bcrypt.compare(rawRefreshToken, session.refreshTokenHash);
      if (match) {
        await this.prisma.refreshSession.update({
          where: { id: session.id },
          data: { revoked: true, revokedAt: new Date() },
        });
        this.events.emit('auth.logout', { userId, sessionId: session.id });
        this.logger.log(`Logout: userId=${userId} sessionId=${session.id}`);
        return { message: 'Logged out successfully' };
      }
    }
    return { message: 'Logged out successfully' };
  }

  // ─── Logout All ───────────────────────────────────────────────────────────

  async logoutAll(userId: string) {
    await this.prisma.refreshSession.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true, revokedAt: new Date() },
    });
    this.events.emit('auth.logout', { userId, all: true });
    this.logger.log(`Logout all: userId=${userId}`);
    return { message: 'All sessions revoked' };
  }

  // ─── Sessions ─────────────────────────────────────────────────────────────

  async getSessions(userId: string) {
    return this.prisma.refreshSession.findMany({
      where: { userId, revoked: false, expiresAt: { gt: new Date() } },
      select: { id: true, deviceInfo: true, ipAddress: true, userAgent: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeSession(userId: string, sessionId: string) {
    const session = await this.prisma.refreshSession.findUnique({ where: { id: sessionId } });
    if (!session || session.userId !== userId) throw new NotFoundException('Session not found');

    await this.prisma.refreshSession.update({
      where: { id: sessionId },
      data: { revoked: true, revokedAt: new Date() },
    });
    this.events.emit('auth.session.revoked', { userId, sessionId });
    return { message: 'Session revoked' };
  }

  // ─── Token issuance ───────────────────────────────────────────────────────

  private async issueTokens(userId: string, phone: string, meta?: { ip?: string; userAgent?: string }) {
    const payload = { sub: userId, phone };

    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get<string>('jwt.accessSecret'),
      expiresIn: this.config.get<string>('jwt.accessExpiresIn'),
    });

    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get<string>('jwt.refreshSecret'),
      expiresIn: this.config.get<string>('jwt.refreshExpiresIn'),
    });

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshSession.create({
      data: {
        userId,
        refreshTokenHash,
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
        deviceInfo: meta?.userAgent ? this.parseDevice(meta.userAgent) : null,
        expiresAt,
      },
    });

    return { accessToken, refreshToken, expiresIn: 900 };
  }

  private parseDevice(userAgent: string): string {
    if (/mobile/i.test(userAgent)) return 'Mobile';
    if (/chrome/i.test(userAgent)) return 'Chrome';
    if (/firefox/i.test(userAgent)) return 'Firefox';
    if (/safari/i.test(userAgent)) return 'Safari';
    return 'Unknown';
  }
}
