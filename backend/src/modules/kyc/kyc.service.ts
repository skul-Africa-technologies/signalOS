import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { SubmitBvnDto, SubmitNinDto, SubmitDocumentDto, ReviewKycDto, KycStatus, KycVerificationLevel } from './dto/kyc.dto';

export const KYC_EVENTS = {
  SUBMITTED: 'kyc.submitted',
  VERIFIED: 'kyc.verified',
  REJECTED: 'kyc.rejected',
  RISK_DETECTED: 'identity.risk.detected',
} as const;

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  private hashSensitiveData(value: string): string {
    return createHash('sha256').update(value + (process.env.KYC_HASH_SALT ?? 'kyc-salt')).digest('hex');
  }

  async getOrCreateProfile(userId: string) {
    return this.prisma.kycProfile.upsert({
      where: { userId },
      create: { userId },
      update: {},
      include: { documents: true },
    });
  }

  async submitBvn(userId: string, dto: SubmitBvnDto) {
    const profile = await this.getOrCreateProfile(userId);
    if (profile.bvnVerified) throw new BadRequestException('BVN already verified');

    // Simulate provider verification (in production: call Smile Identity / Prembly)
    const bvnHash = this.hashSensitiveData(dto.bvn);
    const verified = dto.bvn.length === 11; // mock: always passes format check

    const updated = await this.prisma.kycProfile.update({
      where: { userId },
      data: {
        bvnHash,
        bvnVerified: verified,
        status: KycStatus.UNDER_REVIEW,
        submittedAt: new Date(),
        verificationLevel: this.computeLevel({ ...profile, bvnVerified: verified }),
      },
    });

    this.events.emit(KYC_EVENTS.SUBMITTED, { userId, type: 'BVN', profileId: updated.id });
    this.logger.log(`BVN submitted for user ${userId}`);
    return updated;
  }

  async submitNin(userId: string, dto: SubmitNinDto) {
    const profile = await this.getOrCreateProfile(userId);
    if (profile.ninVerified) throw new BadRequestException('NIN already verified');

    const ninHash = this.hashSensitiveData(dto.nin);
    const verified = dto.nin.length === 11;

    const updated = await this.prisma.kycProfile.update({
      where: { userId },
      data: {
        ninHash,
        ninVerified: verified,
        status: KycStatus.UNDER_REVIEW,
        submittedAt: profile.submittedAt ?? new Date(),
        verificationLevel: this.computeLevel({ ...profile, ninVerified: verified }),
      },
    });

    this.events.emit(KYC_EVENTS.SUBMITTED, { userId, type: 'NIN', profileId: updated.id });
    return updated;
  }

  async submitDocument(userId: string, dto: SubmitDocumentDto) {
    const profile = await this.getOrCreateProfile(userId);

    const doc = await this.prisma.kycDocument.create({
      data: {
        kycProfileId: profile.id,
        type: dto.type,
        storageKey: dto.storageKey,
        metadata: dto.metadata,
        status: 'PENDING',
        confidence: 0,
      },
    });

    // Simulate selfie/liveness check
    if (dto.type === 'SELFIE') {
      const confidence = 0.92; // mock confidence score
      await this.prisma.kycDocument.update({
        where: { id: doc.id },
        data: { status: 'APPROVED', confidence, reviewedAt: new Date() },
      });
      await this.prisma.kycProfile.update({
        where: { userId },
        data: { selfieVerified: true },
      });
    }

    this.events.emit(KYC_EVENTS.SUBMITTED, { userId, type: dto.type, documentId: doc.id });
    return doc;
  }

  async reviewKyc(userId: string, dto: ReviewKycDto) {
    const profile = await this.prisma.kycProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('KYC profile not found');

    const data: any = { status: dto.status };

    if (dto.status === KycStatus.VERIFIED) {
      data.verifiedAt = new Date();
      data.riskLevel = this.computeRiskLevel(profile);
    } else if (dto.status === KycStatus.REJECTED) {
      if (!dto.rejectionReason) throw new BadRequestException('Rejection reason required');
      data.rejectedAt = new Date();
      data.rejectionReason = dto.rejectionReason;
    }

    const updated = await this.prisma.kycProfile.update({ where: { userId }, data });

    if (dto.status === KycStatus.VERIFIED) {
      this.events.emit(KYC_EVENTS.VERIFIED, { userId, profileId: profile.id, verificationLevel: updated.verificationLevel });
    } else if (dto.status === KycStatus.REJECTED) {
      this.events.emit(KYC_EVENTS.REJECTED, { userId, profileId: profile.id, reason: dto.rejectionReason });
    }

    return updated;
  }

  async runRiskScan(userId: string) {
    const profile = await this.prisma.kycProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('KYC profile not found');

    const riskLevel = this.computeRiskLevel(profile);
    const riskScore = this.computeRiskScore(profile);

    await this.prisma.kycProfile.update({ where: { userId }, data: { riskLevel } });

    if (riskScore > 70) {
      this.events.emit(KYC_EVENTS.RISK_DETECTED, { userId, riskLevel, riskScore });
    }

    return { riskLevel, riskScore };
  }

  private computeLevel(profile: any): string {
    const checks = [profile.phoneVerified, profile.bvnVerified, profile.ninVerified, profile.selfieVerified, profile.bankVerified, profile.addressVerified];
    const count = checks.filter(Boolean).length;
    if (count === 0) return KycVerificationLevel.NONE;
    if (count <= 1) return KycVerificationLevel.BASIC;
    if (count <= 3) return KycVerificationLevel.INTERMEDIATE;
    return KycVerificationLevel.FULL;
  }

  private computeRiskLevel(profile: any): string {
    const score = this.computeRiskScore(profile);
    if (score < 20) return 'LOW';
    if (score < 50) return 'MEDIUM';
    if (score < 75) return 'HIGH';
    return 'CRITICAL';
  }

  private computeRiskScore(profile: any): number {
    let score = 100;
    if (profile.bvnVerified) score -= 25;
    if (profile.ninVerified) score -= 25;
    if (profile.selfieVerified) score -= 20;
    if (profile.phoneVerified) score -= 15;
    if (profile.bankVerified) score -= 10;
    if (profile.addressVerified) score -= 5;
    return Math.max(0, score);
  }
}
