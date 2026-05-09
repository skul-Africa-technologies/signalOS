import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { SavingsService } from './savings.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { ContributeDto } from './dto/contribute.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SavingsGroupDto, ContributionDto, GroupAnalyticsDto, ErrorResponseDto } from '../../common/swagger/response.models';

@ApiTags('Savings Groups')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('savings')
export class SavingsController {
  constructor(private readonly savings: SavingsService) {}

  @Post('groups')
  @ApiOperation({ summary: 'Create a savings group', description: 'Creates a cooperative savings group. Groups generate social trust signals that improve member trust scores.' })
  @ApiResponse({ status: 201, description: 'Group created', type: SavingsGroupDto })
  @ApiResponse({ status: 400, description: 'Validation error', type: ErrorResponseDto })
  createGroup(@CurrentUser('sub') userId: string, @Body() dto: CreateGroupDto) {
    return this.savings.createGroup(userId, dto);
  }

  @Get('groups')
  @ApiOperation({ summary: 'List all savings groups', description: 'Returns all available savings groups with member and contribution counts.' })
  @ApiResponse({ status: 200, description: 'Groups list', type: [SavingsGroupDto] })
  listGroups() {
    return this.savings.listGroups();
  }

  @Post('groups/:groupId/join')
  @ApiTags('Contributions')
  @ApiParam({ name: 'groupId', description: 'Savings group ID' })
  @ApiOperation({ summary: 'Join a savings group', description: 'Adds the authenticated user as a member. Membership is required before contributing.' })
  @ApiResponse({ status: 201, description: 'Joined successfully' })
  @ApiResponse({ status: 409, description: 'Already a member', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Group not found', type: ErrorResponseDto })
  joinGroup(@CurrentUser('sub') userId: string, @Param('groupId') groupId: string) {
    return this.savings.joinGroup(userId, groupId);
  }

  @Post('groups/:groupId/contribute')
  @ApiTags('Contributions')
  @ApiParam({ name: 'groupId', description: 'Savings group ID' })
  @ApiOperation({
    summary: 'Make a contribution',
    description: 'Records a savings contribution. Emits `savings.contribution` event → triggers trust score recalculation. Each contribution improves the savings reliability factor (25% weight in trust score).',
  })
  @ApiResponse({ status: 201, description: 'Contribution recorded', type: ContributionDto })
  @ApiResponse({ status: 403, description: 'Not a group member', type: ErrorResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid amount', type: ErrorResponseDto })
  contribute(
    @CurrentUser('sub') userId: string,
    @Param('groupId') groupId: string,
    @Body() dto: ContributeDto,
  ) {
    return this.savings.contribute(userId, groupId, dto);
  }

  @Get('groups/:groupId/contributions')
  @ApiTags('Contributions')
  @ApiParam({ name: 'groupId', description: 'Savings group ID' })
  @ApiOperation({ summary: 'Get group contribution history', description: 'Returns all contributions for a group with contributor details.' })
  @ApiResponse({ status: 200, description: 'Contribution history', type: [ContributionDto] })
  getGroupContributions(@Param('groupId') groupId: string) {
    return this.savings.getGroupContributions(groupId);
  }

  @Get('groups/:groupId/analytics')
  @ApiTags('Contributions')
  @ApiParam({ name: 'groupId', description: 'Savings group ID' })
  @ApiOperation({ summary: 'Get group analytics', description: 'Returns total saved, member count, contribution count, and progress toward target amount.' })
  @ApiResponse({ status: 200, description: 'Group analytics', type: GroupAnalyticsDto })
  @ApiResponse({ status: 404, description: 'Group not found', type: ErrorResponseDto })
  getGroupAnalytics(@Param('groupId') groupId: string) {
    return this.savings.getGroupAnalytics(groupId);
  }

  @Get('my-contributions')
  @ApiTags('Contributions')
  @ApiOperation({ summary: 'Get my contribution history', description: 'Returns all contributions made by the authenticated user across all groups.' })
  @ApiResponse({ status: 200, description: 'My contributions', type: [ContributionDto] })
  getMyContributions(@CurrentUser('sub') userId: string) {
    return this.savings.getUserContributions(userId);
  }
}
