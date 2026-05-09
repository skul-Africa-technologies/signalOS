import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    PassportModule,
    // JwtModule registered without default secret — each sign call passes its own secret
    JwtModule.register({}),
    WalletModule,
  ],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy, RefreshTokenGuard],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
