import { Injectable, ConflictException, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
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
    private readonly walletService: WalletService,
  ) {}

  async signup(dto: SignupDto) {
    const existing = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (existing) throw new ConflictException('Phone number already registered');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        passwordHash,
        businessType: dto.businessType,
      },
      select: { id: true, name: true, phone: true, businessType: true, trustScore: true, createdAt: true },
    });

    // Auto-create wallet for new user
    await this.walletService.getOrCreate(user.id).catch((err) =>
      this.logger.error(`Failed to create wallet for user ${user.id}: ${err.message}`),
    );

    return { user, accessToken: this.sign(user.id, user.phone) };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const { passwordHash: _, ...profile } = user;
    return { user: profile, accessToken: this.sign(user.id, user.phone) };
  }

  private sign(sub: string, phone: string) {
    return this.jwt.sign({ sub, phone });
  }
}
