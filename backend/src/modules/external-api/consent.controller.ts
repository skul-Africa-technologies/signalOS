import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ConsentService } from './consent.service';
import { GrantConsentDto } from './dto/consent.dto';

@ApiTags('External API — Consent')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('consent')
export class ConsentController {
  constructor(private readonly svc: ConsentService) {}

  @Post('grant')
  @ApiOperation({ summary: 'Grant consent for an organization to access your financial intelligence' })
  grant(@Body() dto: GrantConsentDto) {
    return this.svc.grant(dto);
  }

  @Get('my')
  @ApiOperation({ summary: 'List all consent grants for the authenticated user' })
  listMine(@CurrentUser() user: { id: string }) {
    return this.svc.listForUser(user.id);
  }

  @Patch(':id/revoke')
  @ApiOperation({ summary: 'Revoke a consent grant' })
  revoke(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.svc.revoke(id, user.id);
  }
}
