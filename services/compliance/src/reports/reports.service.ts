// ============================================================
// MONDEGA DIGITAL — Regulatory Reports Service
// SAR (Suspicious Activity Reports), CTR (Currency Transaction Reports)
// Compliant with: SIB Guatemala, CNBV México, GAFILAT
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { AMLAlert } from '../aml/entities/aml-alert.entity';

export interface SARReport {
  reportId: string;
  userId: string;
  alertId: string;
  filingDate: Date;
  reportType: 'SAR' | 'CTR' | 'STR';
  jurisdiction: 'GT' | 'MX' | 'HN' | 'SV' | 'NI' | 'CR';
  totalAmountUSD: number;
  transactionCount: number;
  suspiciousActivity: string;
  narrativeSummary: string;
  status: 'draft' | 'submitted' | 'acknowledged';
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectRepository(AMLAlert)
    private readonly alertRepo: Repository<AMLAlert>,
    private readonly config: ConfigService,
  ) {}

  async generateSAR(alertId: string): Promise<SARReport> {
    const alert = await this.alertRepo.findOneBy({ id: alertId });
    if (!alert) throw new Error(`Alert ${alertId} not found`);

    const report: SARReport = {
      reportId: `SAR-${Date.now()}-${alertId.slice(-6)}`,
      userId: alert.userId,
      alertId,
      filingDate: new Date(),
      reportType: 'SAR',
      jurisdiction: 'GT', // Determined by user country in production
      totalAmountUSD: 0,  // Populated from transaction data
      transactionCount: 1,
      suspiciousActivity: alert.ruleTriggered,
      narrativeSummary: this.generateNarrative(alert),
      status: 'draft',
    };

    this.logger.log(`SAR generated: ${report.reportId} for alert ${alertId}`);
    return report;
  }

  async generateCTRReport(params: {
    userId: string;
    totalUSD: number;
    period: 'daily' | 'monthly';
    country: string;
  }): Promise<{ reportId: string; generated: boolean }> {
    // CTR required for transactions > $10,000 in Guatemala (SIB requirement)
    // or > $7,500 in Mexico (CNBV requirement)
    const thresholds: Record<string, number> = {
      GT: 10000, MX: 7500, HN: 10000, SV: 10000, NI: 10000, CR: 10000,
    };

    const threshold = thresholds[params.country] ?? 10000;

    if (params.totalUSD < threshold) {
      return { reportId: '', generated: false };
    }

    const reportId = `CTR-${params.country}-${Date.now()}`;
    this.logger.log(`CTR report generated: ${reportId} | $${params.totalUSD} | ${params.country}`);

    // In production: submit to regulatory API (SIB Guatemala, CNBV México)
    return { reportId, generated: true };
  }

  private generateNarrative(alert: AMLAlert): string {
    return [
      `On ${alert.createdAt.toISOString().split('T')[0]}, Mondega Digital identified suspicious activity`,
      `for user ${alert.userId}.`,
      `Risk Level: ${alert.riskLevel.toUpperCase()}.`,
      `Rules Triggered: ${alert.ruleTriggered}.`,
      `The transaction(s) have been flagged for regulatory review in accordance with`,
      `GAFILAT Recommendation 20 and applicable national AML/CFT legislation.`,
    ].join(' ');
  }

  async getDashboardMetrics() {
    const [total, open, critical] = await Promise.all([
      this.alertRepo.count(),
      this.alertRepo.count({ where: { status: 'open' } }),
      this.alertRepo.count({ where: { riskLevel: 'critical' as any } }),
    ]);

    return {
      totalAlerts: total,
      openAlerts: open,
      criticalAlerts: critical,
      complianceScore: total > 0 ? Math.round(((total - open) / total) * 100) : 100,
      generatedAt: new Date(),
    };
  }
}
