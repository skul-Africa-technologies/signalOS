import { Controller, Get, Post, Param, Query, Body, UseGuards, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StorageService } from './storage.service';

@ApiTags('File Storage')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'storage', version: ['1', '2'] })
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Get('upload-url')
  @ApiOperation({ summary: 'Get signed upload URL for KYC documents / receipts' })
  @ApiQuery({ name: 'folder', example: 'kyc', enum: ['kyc', 'receipts', 'contracts', 'statements'] })
  @ApiQuery({ name: 'mimeType', example: 'image/jpeg' })
  getUploadUrl(
    @Query('folder') folder: string,
    @Query('mimeType') mimeType: string,
  ) {
    return this.storage.generateSignedUploadUrl(folder ?? 'uploads', mimeType ?? 'application/octet-stream');
  }

  @Get('download-url/:storageKey')
  @ApiOperation({ summary: 'Get signed download URL for a stored file' })
  getDownloadUrl(@Param('storageKey') storageKey: string) {
    return { url: this.storage.getSignedReadUrl(decodeURIComponent(storageKey)) };
  }
}
