import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync } from 'fs';

export interface SignedUploadUrl {
  uploadUrl: string;
  storageKey: string;
  expiresAt: Date;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadDir = process.env.UPLOAD_DIR ?? './uploads';

  constructor() {
    if (!existsSync(this.uploadDir)) mkdirSync(this.uploadDir, { recursive: true });
  }


  generateSignedUploadUrl(folder: string, mimeType: string): SignedUploadUrl {
    const storageKey = `${folder}/${randomUUID()}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    
    const uploadUrl = `/api/v1/storage/upload/${encodeURIComponent(storageKey)}`;

    this.logger.log(`Signed upload URL generated: ${storageKey}`);
    return { uploadUrl, storageKey, expiresAt };
  }

  /** Store file content (local FS in dev) */
  store(storageKey: string, content: Buffer): void {
    const filePath = join(this.uploadDir, storageKey.replace(/\//g, '_'));
    writeFileSync(filePath, content);
    this.logger.log(`File stored: ${storageKey}`);
  }

  /** Retrieve file */
  retrieve(storageKey: string): Buffer {
    const filePath = join(this.uploadDir, storageKey.replace(/\//g, '_'));
    return readFileSync(filePath);
  }

  /** Delete file (lifecycle cleanup) */
  delete(storageKey: string): void {
    const filePath = join(this.uploadDir, storageKey.replace(/\//g, '_'));
    if (existsSync(filePath)) {
      unlinkSync(filePath);
      this.logger.log(`File deleted: ${storageKey}`);
    }
  }

  /** Generate a signed read URL */
  getSignedReadUrl(storageKey: string): string {
    // In production: return S3 presigned GET URL with expiry
    return `/api/v1/storage/download/${encodeURIComponent(storageKey)}`;
  }
}
