import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminGuard } from './guards/admin.guard';
import { RequirePermissions } from './decorators/permissions.decorator';
import { AdminLoginDto, CreateAdminDto, FreezeAccountDto } from './dto/admin.dto';

@ApiTags('Admin Operations')
@Controller('admin')
export class AdminController {
  constructor(private readonly svc: AdminService) {}

  @Post('auth/login')
  @ApiOperation({ summary: 'Admin login — returns x-admin-token' })
  login(@Body() dto: AdminLoginDto, @Request() req: any) {
    return this.svc.login(dto, req.ip);
  }

  @Post('users')
  @ApiOperation({ summary: 'Create admin user (SUPER_ADMIN only)' })
  @ApiSecurity('x-admin-token')
  @UseGuards(AdminGuard)
  @RequirePermissions('*')
  createAdmin(@Body() dto: CreateAdminDto) {
    return this.svc.createAdmin(dto);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Operations dashboard — platform-wide summary' })
  @ApiSecurity('x-admin-token')
  @UseGuards(AdminGuard)
  @RequirePermissions('users.read')
  dashboard() {
    return this.svc.getDashboard();
  }

  @Get('loans')
  @ApiOperation({ summary: 'Loan governance — all disbursements with pagination' })
  @ApiSecurity('x-admin-token')
  @UseGuards(AdminGuard)
  @RequirePermissions('loans.approve')
  loans(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.svc.getLoanGovernance(+page, +limit);
  }

  @Get('treasury')
  @ApiOperation({ summary: 'Treasury overview — all cooperative wallets' })
  @ApiSecurity('x-admin-token')
  @UseGuards(AdminGuard)
  @RequirePermissions('treasury.manage')
  treasury() {
    return this.svc.getTreasuryOverview();
  }

  @Get('users/high-risk')
  @ApiOperation({ summary: 'High-risk users — risk level High or Very High' })
  @ApiSecurity('x-admin-token')
  @UseGuards(AdminGuard)
  @RequirePermissions('users.read')
  highRisk(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.svc.getHighRiskUsers(+page, +limit);
  }

  @Patch('wallets/:userId/freeze')
  @ApiOperation({ summary: 'Freeze a user wallet' })
  @ApiSecurity('x-admin-token')
  @UseGuards(AdminGuard)
  @RequirePermissions('users.freeze')
  freeze(@Param('userId') userId: string, @Body() dto: FreezeAccountDto, @Request() req: any) {
    return this.svc.freezeWallet(userId, dto, req.admin.id);
  }

  @Patch('wallets/:userId/unfreeze')
  @ApiOperation({ summary: 'Unfreeze a user wallet' })
  @ApiSecurity('x-admin-token')
  @UseGuards(AdminGuard)
  @RequirePermissions('users.freeze')
  unfreeze(@Param('userId') userId: string, @Request() req: any) {
    return this.svc.unfreezeWallet(userId, req.admin.id);
  }

  @Patch('loans/:userId/override')
  @ApiOperation({ summary: 'Override loan eligibility for a user' })
  @ApiSecurity('x-admin-token')
  @UseGuards(AdminGuard)
  @RequirePermissions('loans.approve')
  overrideLoan(@Param('userId') userId: string, @Body() body: { eligible: boolean }, @Request() req: any) {
    return this.svc.overrideLoanEligibility(userId, body.eligible, req.admin.id);
  }
}
