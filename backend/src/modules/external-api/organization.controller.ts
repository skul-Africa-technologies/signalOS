import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto, IssueApiKeyDto } from './dto/organization.dto';

@ApiTags('External API — Organizations')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationController {
  constructor(private readonly svc: OrganizationService) {}

  @Post()
  @ApiOperation({ summary: 'Onboard a new organization' })
  create(@Body() dto: CreateOrganizationDto) {
    return this.svc.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all organizations' })
  findAll() {
    return this.svc.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization by ID' })
  findOne(@Param('id') id: string) {
    return this.svc.findById(id);
  }

  @Post(':id/api-keys')
  @ApiOperation({ summary: 'Issue a new API key for an organization' })
  issueKey(@Param('id') id: string, @Body() dto: IssueApiKeyDto) {
    return this.svc.issueApiKey(id, dto);
  }

  @Patch(':id/api-keys/:keyId/revoke')
  @ApiOperation({ summary: 'Revoke an API key' })
  revokeKey(@Param('keyId') keyId: string) {
    return this.svc.revokeApiKey(keyId);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activate organization' })
  activate(@Param('id') id: string) {
    return this.svc.setActive(id, true);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate organization' })
  deactivate(@Param('id') id: string) {
    return this.svc.setActive(id, false);
  }
}
