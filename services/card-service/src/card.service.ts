// ============================================================
// MONDEGA DIGITAL — Card Service
// Tarjeta débito Mondega — Virtual + Física
// Integración con Pomelo (Mastercard Internacional)
// Docs: https://docs.pomelo.la
// ============================================================

import {
  Injectable, Logger, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { CardEntity } from './entities/card.entity';
import { CardTransactionEntity } from './entities/card-transaction.entity';
import { generateId, encrypt, decrypt } from '@mondega/shared-utils';

export type CardType   = 'virtual' | 'physical';
export type CardStatus = 'active' | 'frozen' | 'blocked' | 'expired' | 'pending';
export type CardNetwork = 'mastercard' | 'visa';

export interface IssueCardDTO {
  userId: string;
  type: CardType;
  currency: string;
  spendingLimitDaily?: number;
  deliveryAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
}

// ---- Pomelo types ----

interface PomeloTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface PomeloCard {
  id: string;
  last_four: string;
  expiration_month: string;
  expiration_year: string;
  status: 'ACTIVE' | 'BLOCKED' | 'DISABLED';
  provider: 'MASTERCARD' | 'VISA';
}

interface PomeloSensitiveData {
  pan: string;
  cvv: string;
  expiration_month: string;
  expiration_year: string;
}

interface PomeloAuthWebhook {
  id: string;
  card_id: string;
  status: string;
  amount: {
    local: { total: number; currency: string };
    transaction: { total: number; currency: string };
  };
  merchant: {
    name: string;
    mcc: string;
    country: string;
  };
}

@Injectable()
export class CardService {
  private readonly logger = new Logger(CardService.name);
  private pomeloClient!: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(
    @InjectRepository(CardEntity)
    private readonly cardRepo: Repository<CardEntity>,
    @InjectRepository(CardTransactionEntity)
    private readonly cardTxRepo: Repository<CardTransactionEntity>,
    private readonly config: ConfigService,
  ) {
    const baseUrl = this.config.get<string>(
      'POMELO_API_URL',
      'https://api.sandbox.pomelo.la',
    );
    this.pomeloClient = axios.create({ baseURL: baseUrl, timeout: 10000 });
  }

  // ---- Issue Card ----

  async issueCard(dto: IssueCardDTO): Promise<{
    cardId: string;
    maskedPAN: string;
    status: CardStatus;
    type: CardType;
    estimatedDelivery?: string;
  }> {
    const existing = await this.cardRepo.findOne({
      where: { userId: dto.userId, type: dto.type, status: 'active' },
    });
    if (existing) {
      throw new BadRequestException(`User already has an active ${dto.type} card`);
    }

    const token = await this.getPomeloToken();

    const payload: Record<string, unknown> = {
      user_id:   dto.userId,
      card_type: dto.type === 'virtual' ? 'VIRTUAL' : 'PHYSICAL',
      currency:  dto.currency.toUpperCase(),
      provider:  'MASTERCARD',
    };

    if (dto.type === 'physical' && dto.deliveryAddress) {
      payload['shipping_address'] = {
        address_line_1: dto.deliveryAddress.line1,
        address_line_2: dto.deliveryAddress.line2,
        city:           dto.deliveryAddress.city,
        state:          dto.deliveryAddress.state,
        postal_code:    dto.deliveryAddress.postalCode,
        country:        dto.deliveryAddress.country,
      };
    }

    const res = await this.pomeloClient.post<{ data: PomeloCard }>(
      '/v1/cards',
      payload,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    const pomeloCard = res.data.data;
    const cardId = generateId('crd');

    const card = this.cardRepo.create({
      id:                    cardId,
      userId:                dto.userId,
      issuerCardId:          pomeloCard.id,
      type:                  dto.type,
      status:                'active',
      network:               pomeloCard.provider.toLowerCase() as CardNetwork,
      currency:              dto.currency.toUpperCase(),
      panEncrypted:          encrypt(''),        // PAN never stored — revealed on demand
      lastFour:              pomeloCard.last_four,
      expiryMonth:           pomeloCard.expiration_month,
      expiryYear:            pomeloCard.expiration_year,
      spendingLimitDailyUSD: dto.spendingLimitDaily ?? 500,
      deliveryAddress:       dto.deliveryAddress as Record<string, unknown> | undefined,
    });

    await this.cardRepo.save(card);
    this.logger.log(`Card issued: ${cardId} | ${dto.type} | user=${dto.userId}`);

    return {
      cardId,
      maskedPAN:         `**** **** **** ${card.lastFour}`,
      status:            'active',
      type:              dto.type,
      estimatedDelivery: dto.type === 'physical' ? '7-14 días hábiles' : undefined,
    };
  }

  // ---- Get Card ----

  async getCard(userId: string, cardId: string): Promise<{
    cardId: string;
    maskedPAN: string;
    status: CardStatus;
    type: CardType;
    network: CardNetwork;
    expiryMonth: string;
    expiryYear: string;
    spendingLimitDailyUSD: number;
    createdAt: Date;
  }> {
    const card = await this.cardRepo.findOne({ where: { id: cardId, userId } });
    if (!card) throw new NotFoundException('Card not found');

    return {
      cardId:               card.id,
      maskedPAN:            `**** **** **** ${card.lastFour}`,
      status:               card.status as CardStatus,
      type:                 card.type as CardType,
      network:              card.network as CardNetwork,
      expiryMonth:          card.expiryMonth,
      expiryYear:           card.expiryYear,
      spendingLimitDailyUSD: card.spendingLimitDailyUSD,
      createdAt:            card.createdAt,
    };
  }

  // ---- List Cards for User ----

  async listCards(userId: string) {
    const cards = await this.cardRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return cards.map(c => ({
      cardId:    c.id,
      maskedPAN: `**** **** **** ${c.lastFour}`,
      status:    c.status,
      type:      c.type,
      network:   c.network,
      expiryMonth: c.expiryMonth,
      expiryYear:  c.expiryYear,
      createdAt: c.createdAt,
    }));
  }

  // ---- Freeze / Unfreeze ----

  async setStatus(userId: string, cardId: string, action: 'freeze' | 'unfreeze'): Promise<void> {
    const card = await this.cardRepo.findOne({ where: { id: cardId, userId } });
    if (!card) throw new NotFoundException('Card not found');
    if (card.status === 'blocked') throw new BadRequestException('Blocked cards cannot be modified');

    const pomeloStatus = action === 'freeze' ? 'BLOCKED' : 'ACTIVE';
    const newStatus: CardStatus = action === 'freeze' ? 'frozen' : 'active';

    const token = await this.getPomeloToken();
    await this.pomeloClient.patch(
      `/v1/cards/${card.issuerCardId}/status`,
      { status: pomeloStatus },
      { headers: { Authorization: `Bearer ${token}` } },
    );

    await this.cardRepo.update(cardId, { status: newStatus });
    this.logger.log(`Card ${cardId} ${action}d | user=${userId}`);
  }

  // ---- Reveal Virtual Card PAN/CVV (for online purchases) ----

  async revealCardDetails(userId: string, cardId: string): Promise<{
    pan: string;
    cvv: string;
    expiryMonth: string;
    expiryYear: string;
  }> {
    const card = await this.cardRepo.findOne({
      where: { id: cardId, userId, type: 'virtual' },
    });
    if (!card) throw new NotFoundException('Virtual card not found');
    if (card.status !== 'active') throw new BadRequestException('Card is not active');

    const token = await this.getPomeloToken();
    const res = await this.pomeloClient.post<{ data: PomeloSensitiveData }>(
      `/v1/cards/${card.issuerCardId}/sensitive-data`,
      {},
      { headers: { Authorization: `Bearer ${token}` } },
    );

    const d = res.data.data;
    this.logger.log(`Card details revealed: ${cardId} | user=${userId}`);

    return {
      pan:         d.pan,
      cvv:         d.cvv,
      expiryMonth: d.expiration_month,
      expiryYear:  d.expiration_year,
    };
  }

  // ---- Transaction History ----

  async getTransactions(userId: string, cardId: string, page = 1, limit = 20) {
    const card = await this.cardRepo.findOne({ where: { id: cardId, userId } });
    if (!card) throw new NotFoundException('Card not found');

    const [items, total] = await this.cardTxRepo.findAndCount({
      where: { cardId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit, hasMore: total > page * limit };
  }

  // ---- Pomelo Webhook: Authorization ----

  async handlePomeloAuthorization(payload: PomeloAuthWebhook): Promise<{
    status: 'APPROVED' | 'REJECTED';
    reason?: string;
  }> {
    const card = await this.cardRepo.findOne({
      where: { issuerCardId: payload.card_id },
    });

    if (!card) return { status: 'REJECTED', reason: 'CARD_NOT_FOUND' };
    if (card.status !== 'active') return { status: 'REJECTED', reason: `CARD_${card.status.toUpperCase()}` };

    const amountUSD = payload.amount.transaction.total;
    const todaySpend = await this.getTodaySpend(card.id);

    if (todaySpend + amountUSD > card.spendingLimitDailyUSD) {
      return { status: 'REJECTED', reason: 'DAILY_LIMIT_EXCEEDED' };
    }

    // Record the authorization
    await this.cardTxRepo.save(this.cardTxRepo.create({
      cardId:           card.id,
      issuerTxId:       payload.id,
      type:             'authorization',
      status:           'approved',
      amountUSD,
      amountLocal:      payload.amount.local.total,
      localCurrency:    payload.amount.local.currency,
      merchantName:     payload.merchant.name,
      merchantCategory: payload.merchant.mcc,
      country:          payload.merchant.country,
    }));

    return { status: 'APPROVED' };
  }

  // ---- Private: Pomelo OAuth2 token (client_credentials, cached) ----

  private async getPomeloToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const clientId     = this.config.getOrThrow<string>('POMELO_CLIENT_ID');
    const clientSecret = this.config.getOrThrow<string>('POMELO_CLIENT_SECRET');
    const audience     = this.config.get<string>('POMELO_AUDIENCE', 'https://api.pomelo.la');

    const res = await this.pomeloClient.post<PomeloTokenResponse>(
      '/oauth/token',
      new URLSearchParams({
        grant_type:    'client_credentials',
        client_id:     clientId,
        client_secret: clientSecret,
        audience,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    this.accessToken   = res.data.access_token;
    this.tokenExpiresAt = Date.now() + (res.data.expires_in - 30) * 1000; // 30s buffer
    return this.accessToken;
  }

  private async getTodaySpend(cardId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await this.cardTxRepo
      .createQueryBuilder('tx')
      .select('COALESCE(SUM(tx.amount_usd), 0)', 'total')
      .where('tx.card_id = :cardId', { cardId })
      .andWhere('tx.created_at >= :today', { today })
      .andWhere('tx.status = :status', { status: 'approved' })
      .getRawOne<{ total: string }>();

    return parseFloat(result?.total ?? '0');
  }
}
