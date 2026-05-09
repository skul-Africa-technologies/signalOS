import {
  Controller, Post, Get, Delete, Body, Param,
  HttpCode, HttpStatus, UseGuards, Req,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthResponseDto, ErrorResponseDto } from '../../common/swagger/response.models';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // ─── Signup ───────────────────────────────────────────────────────────────

  @Post('signup')
  @ApiOperation({
    summary: 'Register a new user',
    description: 'Creates an economic identity. Returns access token (15m) and refresh token (7d).',
  })
  @ApiResponse({ status: 201, description: 'Registered successfully', type: AuthResponseDto })
  @ApiResponse({ status: 409, description: 'Phone already registered', type: ErrorResponseDto })
  signup(@Body() dto: SignupDto, @Req() req: Request) {
    return this.auth.signup(dto, { ip: req.ip, userAgent: req.headers['user-agent'] });
  }

  // ─── Login ────────────────────────────────────────────────────────────────

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authenticate user',
    description: 'Returns a short-lived access token (15m) and a long-lived refresh token (7d). Store the refresh token securely and use POST /auth/refresh to renew sessions.',
  })
  @ApiResponse({
    status: 200, description: 'Login successful',
    schema: { example: { user: {}, accessToken: 'eyJ...', refreshToken: 'eyJ...', expiresIn: 900 } },
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials', type: ErrorResponseDto })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.auth.login(dto, { ip: req.ip, userAgent: req.headers['user-agent'] });
  }

  // ─── Refresh ──────────────────────────────────────────────────────────────

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RefreshTokenGuard)
  @ApiOperation({
    summary: 'Rotate refresh token',
    description: 'Validates the refresh token, revokes the old session, and issues a new access token + refresh token pair. Old refresh tokens are immediately invalidated (rotation). Reuse of a revoked token triggers full session revocation.',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200, description: 'Tokens rotated',
    schema: { example: { accessToken: 'eyJ...', refreshToken: 'eyJ...', expiresIn: 900 } },
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  refresh(
    @CurrentUser() user: { sub: string; refreshToken: string },
    @Req() req: Request,
  ) {
    return this.auth.refresh(user.sub, user.refreshToken, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  // ─── Logout ───────────────────────────────────────────────────────────────

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RefreshTokenGuard)
  @ApiOperation({
    summary: 'Logout current session',
    description: 'Revokes the current refresh session. The access token will expire naturally. Send the refresh token in the request body.',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, description: 'Logged out', schema: { example: { message: 'Logged out successfully' } } })
  logout(
    @CurrentUser() user: { sub: string; refreshToken: string },
  ) {
    return this.auth.logout(user.sub, user.refreshToken);
  }

  // ─── Logout All ───────────────────────────────────────────────────────────

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Logout all devices',
    description: 'Revokes all active refresh sessions for the authenticated user across all devices.',
  })
  @ApiResponse({ status: 200, description: 'All sessions revoked', schema: { example: { message: 'All sessions revoked' } } })
  logoutAll(@CurrentUser('sub') userId: string) {
    return this.auth.logoutAll(userId);
  }

  // ─── Sessions ─────────────────────────────────────────────────────────────

  @Get('sessions')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'List active sessions',
    description: 'Returns all active (non-revoked, non-expired) refresh sessions for the authenticated user.',
  })
  @ApiResponse({
    status: 200, description: 'Active sessions',
    schema: {
      example: [{ id: 'clx...', deviceInfo: 'Chrome', ipAddress: '192.168.1.1', createdAt: '2026-05-09T...', expiresAt: '2026-05-16T...' }],
    },
  })
  getSessions(@CurrentUser('sub') userId: string) {
    return this.auth.getSessions(userId);
  }

  @Delete('sessions/:id')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Revoke a specific session',
    description: 'Revokes a specific refresh session by ID. Use GET /auth/sessions to list session IDs.',
  })
  @ApiResponse({ status: 200, description: 'Session revoked', schema: { example: { message: 'Session revoked' } } })
  @ApiResponse({ status: 404, description: 'Session not found' })
  revokeSession(
    @CurrentUser('sub') userId: string,
    @Param('id') sessionId: string,
  ) {
    return this.auth.revokeSession(userId, sessionId);
  }
}
