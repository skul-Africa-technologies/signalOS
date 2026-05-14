import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { NotificationEventListener } from './notification-event.listener';

@Module({
  providers: [NotificationService, NotificationEventListener],
  controllers: [NotificationController],
  exports: [NotificationService],
})
export class NotificationModule {}
