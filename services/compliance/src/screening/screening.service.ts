// ============================================================
// MONDEGA DIGITAL — Screening Service
// Sanctions list, PEP, adverse media screening
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface ScreeningResult {
  userId: string;
  cleared: boolean;
  hits: ScreeningHit[];
  screenedAt: Date;
  provider: string;
}

export interface ScreeningHit {
  listName: string;   // 'OFAC_SDN' | 'UN_CONSOLIDATED' | 'EU_CONSOLIDATED' | 'PEP'
  entityName: string;
  score: number;      // 0-100 match confidence
  category: string;
  details: string;
}

@Injectable()
export class ScreeningService {
  private readonly logger = new Logger(ScreeningService.name);

  constructor(private readonly config: ConfigService) {}

  async screenUser(params: {
    userId: string;
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    nationality?: string;
    walletAddress?: string;
  }): Promise<ScreeningResult> {
    const hits: ScreeningHit[] = [];

    // Screen 1: Chainalysis wallet address screening
    if (params.walletAddress) {
      const walletHits = await this.screenWalletAddress(params.walletAddress);
      hits.push(...walletHits);
    }

    // Screen 2: Name-based OFAC/PEP screening
    if (params.firstName && params.lastName) {
      const nameHits = await this.screenName({
        firstName: params.firstName,
        lastName: params.lastName,
        dateOfBirth: params.dateOfBirth,
        nationality: params.nationality,
      });
      hits.push(...nameHits);
    }

    const result: ScreeningResult = {
      userId: params.userId,
      cleared: hits.length === 0,
      hits,
      screenedAt: new Date(),
      provider: 'chainalysis+ofac',
    };

    if (!result.cleared) {
      this.logger.warn(
        `Screening HIT for user ${params.userId}: ${hits.map(h => h.listName).join(', ')}`,
      );
    }

    return result;
  }

  private async screenWalletAddress(address: string): Promise<ScreeningHit[]> {
    const key = this.config.get<string>('CHAINALYSIS_API_KEY');
    if (!key) return [];

    try {
      const res = await axios.post(
        'https://api.chainalysis.com/api/risk/v2/entities',
        { address },
        {
          headers: { 'X-API-Key': key, 'Content-Type': 'application/json' },
          timeout: 5000,
        },
      );

      if (res.data?.risk === 'Severe' || res.data?.risk === 'High') {
        return [{
          listName: 'CHAINALYSIS_RISK',
          entityName: address,
          score: 100,
          category: res.data?.category ?? 'Unknown',
          details: `Risk level: ${res.data?.risk}`,
        }];
      }
    } catch (err) {
      this.logger.warn(`Chainalysis wallet screen failed: ${(err as Error).message}`);
    }

    return [];
  }

  private async screenName(params: {
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
    nationality?: string;
  }): Promise<ScreeningHit[]> {
    const ofacKey = this.config.get<string>('OFAC_API_KEY');
    if (!ofacKey) {
      // Fallback: local OFAC check via opensanctions.org (free)
      return this.screenNameOpenSanctions(params);
    }

    try {
      const res = await axios.get(
        `https://sanctionssearch.ofac.treas.gov/api/search`,
        {
          params: {
            name: `${params.firstName} ${params.lastName}`,
            type: 'Individual',
          },
          headers: { 'Api-Key': ofacKey },
          timeout: 8000,
        },
      );

      if (res.data?.results?.length > 0) {
        return res.data.results
          .filter((r: { score: number }) => r.score >= 85)
          .map((r: { name: string; score: number; programs: string[]; remarks: string }) => ({
            listName: 'OFAC_SDN',
            entityName: r.name,
            score: r.score,
            category: r.programs?.join(', ') ?? 'SDN',
            details: r.remarks ?? '',
          }));
      }
    } catch (err) {
      this.logger.warn(`OFAC screening failed: ${(err as Error).message}`);
    }

    return [];
  }

  private async screenNameOpenSanctions(params: {
    firstName: string;
    lastName: string;
  }): Promise<ScreeningHit[]> {
    try {
      const res = await axios.get('https://api.opensanctions.org/match/default', {
        params: {
          queries: JSON.stringify({
            q1: {
              schema: 'Person',
              properties: { name: [`${params.firstName} ${params.lastName}`] },
            },
          }),
        },
        headers: { 'Accept': 'application/json' },
        timeout: 5000,
      });

      const results = res.data?.responses?.q1?.results ?? [];
      return results
        .filter((r: { score: number }) => r.score >= 0.85)
        .map((r: { caption: string; score: number; datasets: string[] }) => ({
          listName: r.datasets?.join(',') ?? 'OPENSANCTIONS',
          entityName: r.caption,
          score: Math.round(r.score * 100),
          category: 'Sanctioned Entity',
          details: `Datasets: ${r.datasets?.join(', ')}`,
        }));
    } catch (err) {
      this.logger.warn(`OpenSanctions screening failed: ${(err as Error).message}`);
      return [];
    }
  }
}
