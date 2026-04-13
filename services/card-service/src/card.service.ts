// ============================================================
// MONDEGA DIGITAL — Card Service (Fase 3)
// Tarjeta débito Mondega — Virtual + Física
// Integración con Mastercard Prepaid Processing (via Issuer)
// ============================================================

import {
  Injectable, Logger, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { CardEntity } from './entities/card.entity';
import { CardTransactionEntity } from './entities/card-transaction.entity';
import { generateId, encrypt, decrypt } from '@mondega/shared-utils';

export type CardType = 'virtual' | 'physical';
export type CardStatus = 'active' | 'frozen' | 'blocked' | 'expired' | 'pending';
export type CardNetwork = 'mastercard' | 'visa';

export interface IssueCardDTO {
  userId: string;
  type: CardType;
  currency: string;
  spendingLimitDaily?: number;  // In USD equivalent
  deliveryAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
}

@Injectable()
export class CardService {
  private readonly logger = new Logger(CardService.name);

  constructor(
    @InjectRepository(CardEntity)
    private readonly cardRepo: Repository<CardEntity>,
    @InjectRepository(CardTransactionEntity)
    private readonly cardTxRepo: Repository<CardTransactionEntity>,
    private readonly config: ConfigService,
  ) {}

  // ---- Issue Card ----

  async issueCard(dto: IssueCardDTO): Promise<{
    cardId: string;
    maskedPAN: string;
    status: CardStatus;
    type: CardType;
    estimatedDelivery?: string;
  }> {
    // Check user doesn't already have active card of same type
    const existing = await this.cardRepo.findOne({
      where: { userId: dto.userId, type: dto.type, status: 'active' },
    });
    if (existing) {
      throw new BadRequestException(`User already has an active ${dto.type} card`);
    }

    // Call card issuer API (Marqeta, Galileo, or local processor)
    const issuerResponse = await this.callIssuerAPI('POST', '/cards', {
      user_token: dto.userId,
      card_product_token: dto.type === 'virtual'
        ? this.config.get('CARD_VIRTUAL_PRODUCT_TOKEN')
        : this.config.get('CARD_PHYSICAL_PRODUCT_TOKEN'),
      fulfillment: dto.deliveryAddress ? {
        card_personalization: { text: { name_line_1: { value: 'MONDEGA USER' } } },
        shipping: {
          recipient_address: {
            address1: dto.deliveryAddress.line1,
            address2: dto.deliveryAddress.line2,
            city: dto.deliveryAddress.city,
            state: dto.deliveryAddress.state,
            postal_code: dto.deliveryAddress.postalCode,
            country: dto.deliveryAddress.country,
          },
        },
      } : undefined,
    });

    const cardId = generateId('crd');
    const card = this.cardRepo.create({
      id: cardId,
      userId: dto.userId,
      issuerCardId: issuerResponse.token,
      type: dto.type,
      status: 'active',
      network: 'mastercard' as CardNetwork,
      currency: dto.currency,
      // Store PAN encrypted — only last 4 exposed to user
      panEncrypted: encrypt(issuerResponse.pan ?? ''),
      lastFour: issuerResponse.last_four,
      expiryMonth: issuerResponse.expiration_time?.slice(5, 7) ?? '00',
      expiryYear: issuerResponse.expiration_time?.slice(0, 4) ?? '0000',
      spendingLimitDailyUSD: dto.spendingLimitDaily ?? 500,
      deliveryAddress: dto.deliveryAddress,
    });

    await this.cardRepo.save(card);

    this.logger.log(`Card issued: ${cardId} | ${dto.type} | user=${dto.userId}`);

    return {
      cardId,
      maskedPAN: `**** **** **** ${card.lastFour}`,
      status: 'active',
      type: dto.type,
      estimatedDelivery: dto.type === 'physical' ? '7-14 días hábiles' : undefined,
    };
  }

  // ---- Get Card Details ----

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
      cardId: card.id,
      maskedPAN: `**** **** **** ${card.lastFour}`,
      status: card.status as CardStatus,
      type: card.type as CardType,
      network: card.network as CardNetwork,
      expiryMonth: card.expiryMonth,
      expiryYear: card.expiryYear,
      spendingLimitDailyUSD: card.spendingLimitDailyUSD,
      createdAt: card.createdAt,
    };
  }

  // ---- Freeze / Unfreeze ----

  async setStatus(userId: string, cardId: string, action: 'freeze' | 'unfreeze'): Promise<void> {
    const card = await this.cardRepo.findOne({ where: { id: cardId, userId } });
    if (!card) throw new NotFoundException('Card not found');
    if (card.status === 'blocked') throw new BadRequestException('Blocked cards cannot be unfrozen');

    const newStatus: CardStatus = action === 'freeze' ? 'frozen' : 'active';

    // Sync with issuer
    await this.callIssuerAPI('PUT', `/cards/${card.issuerCardId}`, {
      state: action === 'freeze' ? 'SUSPENDED' : 'ACTIVE',
    });

    await this.cardRepo.update(cardId, { status: newStatus });
    this.logger.log(`Card ${cardId} ${action}d by user ${userId}`);
  }

  // ---- Reveal Virtual Card Details (for online purchases) ----

  async revealCardDetails(userId: string, cardId: string, pin: string): Promise<{
    pan: string;
    cvv: string;
    expiryMonth: string;
    expiryYear: string;
  }> {
    const card = await this.cardRepo.findOne({ where: { id: cardId, userId, type: 'virtual' } });
    if (!card) throw new NotFoundException('Virtual card not found');
    if (card.status !== 'active') throw new BadRequestException('Card is not active');

    // Verify PIN (would call auth service in production)
    // Get sensitive data from issuer (they hold it, we never store unencrypted)
    const issuerDetails = await this.callIssuerAPI('GET', `/cards/${card.issuerCardId}/showpan`);

    this.logger.log(`Card details revealed for ${cardId} | user=${userId}`);

    return {
      pan: issuerDetails.pan,
      cvv: issuerDetails.cvv_number,
      expiryMonth: card.expiryMonth,
      expiryYear: card.expiryYear,
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

  // ---- Webhook: Authorization request from card network ----

  async handleAuthorizationRequest(payload: {
    cardToken: string;
    amountUSD: number;
    merchantName: string;
    merchantCategory: string;
    country: string;
  }): Promise<{ approved: boolean; declineReason?: string }> {
    const card = await this.cardRepo.findOne({
      where: { issuerCardId: payload.cardToken },
    });

    if (!card) return { approved: false, declineReason: 'Card not found' };
    if (card.status !== 'active') return { approved: false, declineReason: `Card ${card.status}` };

    // Check daily spending limit
    const todaySpend = await this.getTodaySpend(card.id);
    if (todaySpend + payload.amountUSD > card.spendingLimitDailyUSD) {
      return { approved: false, declineReason: 'Daily spending limit exceeded' };
    }

    // Check balance (would call wallet service in production)

    return { approved: true };
  }

  // ---- Private Helpers ----

  private async callIssuerAPI(method: string, path: string, body?: Record<string, unknown>) {
    const baseUrl = this.config.get('CARD_ISSUER_BASE_URL', 'https://sandbox.marqeta.com/v3');
    const key = this.config.getOrThrow('CARD_ISSUER_API_KEY');
    const secret = this.config.getOrThrow('CARD_ISSUER_API_SECRET');

    const res = await axios.request({
      method: method as any,
      url: `${baseUrl}${path}`,
      auth: { username: key, password: secret },
      data: body,
      timeout: 10000,
    });

    return res.data;
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
