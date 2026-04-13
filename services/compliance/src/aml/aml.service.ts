// ============================================================
// MONDEGA DIGITAL — AML Service
// Anti-Money Laundering rules engine
// Follows FATF recommendations for Central America
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import axios from 'axios';
import { AMLAlert } from './entities/aml-alert.entity';
import { AMLRisk, KYCLevel } from '@mondega/shared-types';
import { fromMondgUnits } from '@mondega/shared-utils';

// FATF recommended thresholds (in USD)
const ALERT_THRESHOLDS = {
  SINGLE_TX_REPORT:  1000,   // Immediate report for single tx
  DAILY_ACCUMULATE:  2000,   // Cumulative daily
  MONTHLY_ACCUMULATE: 10000, // Cumulative monthly
  STRUCTURING_WINDOW: 900,   // 15 min window for structuring detection
  STRUCTURING_AMOUNT: 800,   // Multiple txs just below $1000 = structuring
} as const;

export interface AMLCheckInput {
  transactionId: string;
  userId: string;
  counterpartyId?: string;
  amountMondg: string;       // Raw units
  usdEquivalent: number;
  txType: string;
  fromCountry?: string;
  toCountry?: string;
  kycLevel: KYCLevel;
  timestamp: Date;
}

export interface AMLCheckResult {
  approved: boolean;
  riskLevel: AMLRisk;
  rulesTriggered: string[];
  requiresReview: boolean;
  reportToAuthority: boolean;
  blockTransaction: boolean;
}

@Injectable()
export class AMLService {
  private readonly logger = new Logger(AMLService.name);

  constructor(
    @InjectRepository(AMLAlert)
    private readonly alertRepo: Repository<AMLAlert>,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
    @InjectQueue('compliance')
    private readonly complianceQueue: Queue,
  ) {}

  // ---- Main AML Check ----

  async checkTransaction(input: AMLCheckInput): Promise<AMLCheckResult> {
    const rules: string[] = [];
    let riskLevel = AMLRisk.LOW;
    let blockTransaction = false;
    let reportToAuthority = false;

    // Rule 1: KYC limits check
    const kycResult = this.checkKYCLimits(input);
    if (!kycResult.passed) {
      rules.push(`KYC_LIMIT_EXCEEDED: ${kycResult.reason}`);
      blockTransaction = true;
      riskLevel = AMLRisk.HIGH;
    }

    // Rule 2: Single transaction reporting threshold
    if (input.usdEquivalent >= ALERT_THRESHOLDS.SINGLE_TX_REPORT) {
      rules.push(`SINGLE_TX_THRESHOLD: $${input.usdEquivalent.toFixed(2)} >= $${ALERT_THRESHOLDS.SINGLE_TX_REPORT}`);
      riskLevel = this.maxRisk(riskLevel, AMLRisk.MEDIUM);
      reportToAuthority = true;
    }

    // Rule 3: Structuring detection (multiple txs just below threshold)
    const structuringDetected = await this.detectStructuring(input);
    if (structuringDetected) {
      rules.push('STRUCTURING_DETECTED: Multiple transactions just below reporting threshold');
      riskLevel = this.maxRisk(riskLevel, AMLRisk.HIGH);
      blockTransaction = true;
      reportToAuthority = true;
    }

    // Rule 4: Cumulative daily limit
    const dailyTotal = await this.getDailyTotal(input.userId);
    if (dailyTotal + input.usdEquivalent > ALERT_THRESHOLDS.DAILY_ACCUMULATE) {
      rules.push(`DAILY_LIMIT: Cumulative $${(dailyTotal + input.usdEquivalent).toFixed(2)}`);
      riskLevel = this.maxRisk(riskLevel, AMLRisk.MEDIUM);
      if (input.kycLevel < KYCLevel.VERIFIED) {
        blockTransaction = true;
      }
    }

    // Rule 5: Chainalysis OFAC/sanctions screening
    const sanctionsResult = await this.screenSanctions(input);
    if (sanctionsResult.matched) {
      rules.push(`SANCTIONS_HIT: ${sanctionsResult.matchType} — ${sanctionsResult.entity}`);
      riskLevel = AMLRisk.CRITICAL;
      blockTransaction = true;
      reportToAuthority = true;
    }

    // Rule 6: High-risk country corridors
    if (this.isHighRiskCorridor(input.fromCountry, input.toCountry)) {
      rules.push(`HIGH_RISK_CORRIDOR: ${input.fromCountry}→${input.toCountry}`);
      riskLevel = this.maxRisk(riskLevel, AMLRisk.MEDIUM);
    }

    // Rule 7: Velocity check — too many transactions in short time
    const velocityFlag = await this.checkVelocity(input.userId);
    if (velocityFlag.exceeded) {
      rules.push(`VELOCITY_EXCEEDED: ${velocityFlag.txCount} txs in ${velocityFlag.windowMinutes} minutes`);
      riskLevel = this.maxRisk(riskLevel, AMLRisk.HIGH);
      blockTransaction = true;
    }

    // Create alert if any rules triggered
    if (rules.length > 0) {
      await this.createAlert({
        userId: input.userId,
        transactionId: input.transactionId,
        riskLevel,
        rules,
        reportToAuthority,
      });
    }

    const result: AMLCheckResult = {
      approved: !blockTransaction,
      riskLevel,
      rulesTriggered: rules,
      requiresReview: rules.length > 0 && !blockTransaction,
      reportToAuthority,
      blockTransaction,
    };

    this.logger.log(
      `AML check tx=${input.transactionId}: ${result.approved ? 'APPROVED' : 'BLOCKED'} ` +
      `risk=${riskLevel} rules=${rules.length}`,
    );

    return result;
  }

  // ---- Rule Implementations ----

  private checkKYCLimits(input: AMLCheckInput): { passed: boolean; reason?: string } {
    const limits: Record<KYCLevel, { singleTx: number }> = {
      [KYCLevel.ANONYMOUS]: { singleTx: 50 },
      [KYCLevel.BASIC]:     { singleTx: 200 },
      [KYCLevel.VERIFIED]:  { singleTx: 2000 },
      [KYCLevel.BUSINESS]:  { singleTx: 100000 },
    };
    const limit = limits[input.kycLevel];
    if (input.usdEquivalent > limit.singleTx) {
      return {
        passed: false,
        reason: `USD ${input.usdEquivalent.toFixed(2)} exceeds KYC level ${input.kycLevel} limit of $${limit.singleTx}`,
      };
    }
    return { passed: true };
  }

  private async detectStructuring(input: AMLCheckInput): Promise<boolean> {
    // Look for multiple transactions just below reporting threshold in 15-min window
    const windowStart = new Date(input.timestamp.getTime() - ALERT_THRESHOLDS.STRUCTURING_WINDOW * 1000);
    const recentAlerts = await this.alertRepo.count({
      where: {
        userId: input.userId,
        // Only consider txs that triggered single-tx threshold
      },
    });

    // If multiple txs below $1000 but collectively would exceed, flag as structuring
    const dailyTotal = await this.getDailyTotal(input.userId);
    if (
      input.usdEquivalent < ALERT_THRESHOLDS.SINGLE_TX_REPORT &&
      input.usdEquivalent > ALERT_THRESHOLDS.STRUCTURING_AMOUNT &&
      dailyTotal > ALERT_THRESHOLDS.STRUCTURING_AMOUNT * 2
    ) {
      return true;
    }

    return false;
  }

  private async getDailyTotal(userId: string): Promise<number> {
    // In production: query from tx-engine or materialized view
    // Simplified: return 0 as we'd normally aggregate from transactions table
    return 0;
  }

  private async screenSanctions(input: AMLCheckInput): Promise<{
    matched: boolean;
    matchType?: string;
    entity?: string;
  }> {
    const chainalysisKey = this.config.get<string>('CHAINALYSIS_API_KEY');
    if (!chainalysisKey) {
      this.logger.warn('Chainalysis API key not configured — skipping sanctions screen');
      return { matched: false };
    }

    try {
      // Screen user ID against OFAC/UN/EU sanctions lists
      const res = await axios.get(
        `https://api.chainalysis.com/api/risk/v2/entities/${input.userId}`,
        {
          headers: { 'X-API-Key': chainalysisKey, 'Accept': 'application/json' },
          timeout: 5000,
        },
      );

      if (res.data?.risk === 'Severe' || res.data?.category === 'sanctions') {
        return {
          matched: true,
          matchType: 'OFAC_SANCTIONS',
          entity: res.data?.name ?? 'Unknown',
        };
      }
    } catch (err) {
      this.logger.warn(`Chainalysis screening failed: ${(err as Error).message}`);
    }

    return { matched: false };
  }

  private isHighRiskCorridor(from?: string, to?: string): boolean {
    const highRiskCountries = new Set(['VE', 'CU', 'IR', 'KP', 'SY', 'RU', 'BY']);
    return !!(from && highRiskCountries.has(from)) || !!(to && highRiskCountries.has(to));
  }

  private async checkVelocity(userId: string): Promise<{
    exceeded: boolean;
    txCount: number;
    windowMinutes: number;
  }> {
    // Max 10 transactions in any 5-minute window
    const MAX_TX_PER_WINDOW = 10;
    const WINDOW_MINUTES = 5;
    // In production: check Redis sorted set of recent tx timestamps
    return { exceeded: false, txCount: 0, windowMinutes: WINDOW_MINUTES };
  }

  // ---- Alert Management ----

  private async createAlert(params: {
    userId: string;
    transactionId: string;
    riskLevel: AMLRisk;
    rules: string[];
    reportToAuthority: boolean;
  }): Promise<void> {
    const alert = this.alertRepo.create({
      userId: params.userId,
      transactionId: params.transactionId,
      riskLevel: params.riskLevel,
      ruleTriggered: params.rules.join(' | '),
      description: `AML alert: ${params.rules.length} rule(s) triggered`,
      status: 'open',
    });
    await this.alertRepo.save(alert);

    // Queue for compliance officer review
    await this.complianceQueue.add('aml-alert', {
      alertId: alert.id,
      userId: params.userId,
      riskLevel: params.riskLevel,
      reportToAuthority: params.reportToAuthority,
      timestamp: new Date(),
    }, { priority: params.riskLevel === AMLRisk.CRITICAL ? 1 : 5 });

    this.logger.warn(
      `AML Alert created: ${alert.id} | user=${params.userId} | risk=${params.riskLevel} | ` +
      `rules: ${params.rules.join(', ')}`,
    );
  }

  // ---- Reporting ----

  async getAlerts(filters: {
    status?: string;
    riskLevel?: AMLRisk;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 20 } = filters;
    const where: Record<string, unknown> = {};
    if (filters.status) where.status = filters.status;
    if (filters.riskLevel) where.riskLevel = filters.riskLevel;

    const [items, total] = await this.alertRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit, hasMore: total > page * limit };
  }

  async resolveAlert(alertId: string, resolution: {
    status: 'cleared' | 'reported';
    notes: string;
    assignedTo: string;
  }): Promise<void> {
    await this.alertRepo.update({ id: alertId }, {
      status: resolution.status,
      resolvedAt: new Date(),
    });
    this.logger.log(`Alert ${alertId} resolved: ${resolution.status} by ${resolution.assignedTo}`);
  }

  private maxRisk(a: AMLRisk, b: AMLRisk): AMLRisk {
    const order = { low: 0, medium: 1, high: 2, critical: 3 };
    return order[a] >= order[b] ? a : b;
  }
}
