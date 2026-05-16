import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QueueService, QueueName } from './queue.service';

@ApiTags('Queue Infrastructure')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'queues', version: ['1', '2'] })
export class QueueController {
  constructor(private readonly queue: QueueService) {}

  @Get()
  @ApiOperation({ summary: 'Get stats for all queues' })
  getAllStats() {
    return this.queue.getAllStats();
  }

  @Get(':name')
  @ApiOperation({ summary: 'Get stats for a specific queue' })
  getStats(@Param('name') name: QueueName) {
    return this.queue.getStats(name);
  }
}
