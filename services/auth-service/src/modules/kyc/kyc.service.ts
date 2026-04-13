// ============================================================
// MONDEGA DIGITAL — KYC Service
// Integración con Jumio para verificación de identidad
// ============================================================

import {
  Injectable, Logger, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import axios from 'axios';
import { User } from '../users/entities/user.entity';
import { KYCLevel, KYCStatus } from '@mondega/shared-types';

interface JumioInitResponse {
  timestamp: string;
  transactionReference: string;
  redirectUrl: string;
}

interface JumioWebhookPayload {
  callbackType: string;
  transactionReference: string;
  customerInternalReference: string;
  workflowExecution: {
    status: 'PROCESSED' | 'SESSION_EXPIRED' | 'TOKEN_EXPIRED';
    credentials: Array<{
      id: string;
      category: string;
      parts: Array<{ classifier: string; href: string }>;
    }>;
    capabilities: {
      extraction?: { decision: { type: string } };
      liveness?: { decision: { type: string } };
      similarity?: { decision: { type: string; details?: { similarity: string } } };
      dataChecks?: { decision: { type: string } };
    };
  };
  decision: {
    type: 'PASSED' | 'REJECTED' | 'WARNING' | 'NOT_EXECUTED';
    details?: { label: string };
  };
}

@Injectable()
export class KYCService {
  private readonly logger = new Logger(KYCService.name);
  private readonly jumioBaseUrl: string;
  private readonly jumioApiKey: string;
  private readonly jumioApiSecret: string;

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly config: ConfigService,
    @InjectQueue('kyc')
    private readonly kycQueue: Queue,
  ) {
    this.jumioBaseUrl = config.get('JUMIO_BASE_URL', 'https://account.amer-1.jumio.ai');
    this.jumioApiKey = config.getOrThrow('JUMIO_API_KEY');
    this.jumioApiSecret = config.getOrThrow('JUMIO_API_SECRET');
  }

  // ---- Initiate KYC Session ----

  async initiateKYC(userId: string, returnUrl?: string): Promise<{
    redirectUrl: string;
    sessionReference: string;
  }> {
    const user = await this.userRepo.findOne({ where: { externalId: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.kycLevel >= KYCLevel.VERIFIED) {
      throw new BadRequestException('KYC already completed at this level');
    }

    const credentials = Buffer.from(`${this.jumioApiKey}:${this.jumioApiSecret}`).toString('base64');

    const response = await axios.post<JumioInitResponse>(
      `${this.jumioBaseUrl}/api/v1/initiate`,
      {
        customerInternalReference: user.externalId,
        userReference: user.externalId,
        workflowDefinition: {
          key: 2,  // Workflow 2: ID + Liveness check
        },
        callbackUrl: `${this.config.get('APP_URL')}/api/kyc/webhook`,
        successUrl: returnUrl ?? `${this.config.get('APP_URL')}/kyc/success`,
        errorUrl: `${this.config.get('APP_URL')}/kyc/error`,
        locale: this.getLocaleForCountry(user.country),
      },
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': 'MondegaDigital/1.0',
        },
        timeout: 10000,
      },
    );

    // Update KYC status to in-review
    user.kycStatus = KYCStatus.IN_REVIEW;
    await this.userRepo.save(user);

    this.logger.log(`KYC initiated for user ${userId}: ${response.data.transactionReference}`);

    return {
      redirectUrl: response.data.redirectUrl,
      sessionReference: response.data.transactionReference,
    };
  }

  // ---- Process Jumio Webhook ----

  async processWebhook(payload: JumioWebhookPayload): Promise<void> {
    const userId = payload.customerInternalReference;
    const user = await this.userRepo.findOne({ where: { externalId: userId } });
    if (!user) {
      this.logger.warn(`KYC webhook for unknown user: ${userId}`);
      return;
    }

    const decision = payload.decision?.type;
    const status = payload.workflowExecution?.status;

    if (status === 'SESSION_EXPIRED' || status === 'TOKEN_EXPIRED') {
      user.kycStatus = KYCStatus.EXPIRED;
      await this.userRepo.save(user);
      await this.kycQueue.add('kyc-expired', { userId });
      return;
    }

    if (decision === 'PASSED') {
      // Promote KYC level based on what was verified
      const capabilities = payload.workflowExecution?.capabilities;
      const hasLiveness = capabilities?.liveness?.decision?.type === 'PASSED';
      const hasSimilarity = capabilities?.similarity?.decision?.type === 'PASSED';
      const hasExtraction = capabilities?.extraction?.decision?.type === 'PASSED';

      if (hasLiveness && hasSimilarity && hasExtraction) {
        user.kycLevel = KYCLevel.VERIFIED;
      } else {
        user.kycLevel = KYCLevel.BASIC;
      }
      user.kycStatus = KYCStatus.APPROVED;

      this.logger.log(`KYC PASSED for user ${userId}: level promoted to ${user.kycLevel}`);

      await this.kycQueue.add('kyc-approved', {
        userId,
        newKycLevel: user.kycLevel,
      });

    } else if (decision === 'REJECTED') {
      user.kycStatus = KYCStatus.REJECTED;
      this.logger.warn(`KYC REJECTED for user ${userId}: ${payload.decision?.details?.label}`);
      await this.kycQueue.add('kyc-rejected', {
        userId,
        reason: payload.decision?.details?.label ?? 'Unknown',
      });
    }

    await this.userRepo.save(user);
  }

  // ---- Get KYC Status ----

  async getKYCStatus(userId: string) {
    const user = await this.userRepo.findOne({
      where: { externalId: userId },
      select: ['kycLevel', 'kycStatus', 'country'],
    });
    if (!user) throw new NotFoundException('User not found');

    return {
      kycLevel: user.kycLevel,
      kycStatus: user.kycStatus,
      requiredDocuments: this.getRequiredDocuments(user.kycLevel),
      nextLevel: user.kycLevel < KYCLevel.BUSINESS ? user.kycLevel + 1 : null,
      limits: this.getLimitsForLevel(user.kycLevel),
    };
  }

  // ---- Helpers ----

  private getLocaleForCountry(country: string): string {
    const locales: Record<string, string> = {
      GT: 'es', MX: 'es', HN: 'es',
      SV: 'es', NI: 'es', CR: 'es',
      BZ: 'en', US: 'en',
    };
    return locales[country] ?? 'es';
  }

  private getRequiredDocuments(currentLevel: KYCLevel): string[] {
    if (currentLevel === KYCLevel.ANONYMOUS) {
      return ['national_id_or_passport', 'selfie'];
    }
    if (currentLevel === KYCLevel.BASIC) {
      return ['proof_of_address'];
    }
    if (currentLevel === KYCLevel.VERIFIED) {
      return ['business_registration', 'tax_id', 'beneficial_owners'];
    }
    return [];
  }

  private getLimitsForLevel(level: KYCLevel) {
    const limits = {
      [KYCLevel.ANONYMOUS]: { daily: 50, monthly: 200, singleTx: 50 },
      [KYCLevel.BASIC]:     { daily: 200, monthly: 1000, singleTx: 200 },
      [KYCLevel.VERIFIED]:  { daily: 2000, monthly: 10000, singleTx: 2000 },
      [KYCLevel.BUSINESS]:  { daily: 100000, monthly: 1000000, singleTx: 100000 },
    };
    return limits[level];
  }
}
