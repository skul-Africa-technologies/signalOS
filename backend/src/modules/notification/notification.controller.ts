import { Body, Controller, Get, Param, Patch, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { NotificationService } from './notification.service';

@ApiTags('Notifications')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly svc: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Get notifications for authenticated user' })
  list(@CurrentUser() user: { id: string }) {
    return this.svc.getForUser(user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  markRead(@Param('id') id: string) {
    return this.svc.markRead(id);
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences' })
  getPrefs(@CurrentUser() user: { id: string }) {
    return this.svc.getPreferences(user.id);
  }

  @Put('preferences')
  @ApiOperation({ summary: 'Update notification preferences' })
  updatePrefs(@CurrentUser() user: { id: string }, @Body() body: any) {
    return this.svc.updatePreferences(user.id, body);
  }
}
