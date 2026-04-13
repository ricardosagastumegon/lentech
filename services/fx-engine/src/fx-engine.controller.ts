// ============================================================
// MONDEGA DIGITAL — FX Engine Controller
// ============================================================

import {
  Controller, Get, Post, Body, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FXEngineService } from './fx-engine.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { DigitalCoin, FeeType } from '@mondega/shared-types/currencies';
import { IsEnum, IsNumber, IsPositive, IsOptional, IsString } from 'class-validator';

class GetQuoteDTO {
  @IsEnum(DigitalCoin)
  fromCoin!: DigitalCoin;

  @IsEnum(DigitalCoin)
  toCoin!: DigitalCoin;

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsOptional()
  @IsString()
  direction?: 'from' | 'to';  // 'from': I send X, how much arrives? 'to': they get X, how much do I send?

  @IsOptional()
  @IsEnum(['p2p_same_coin','p2p_cross_coin','purchase','redemption','b2b_commercial','remittance','fiat_load_bank','fiat_load_card','fiat_load_cash'] as const)
  feeType?: FeeType;
}

class ConsumeQuoteDTO {
  @IsString()
  quoteId!: string;
}

@ApiTags('fx')
@Controller('fx')
export class FXEngineController {
  constructor(private readonly fxService: FXEngineService) {}

  @Get('rates')
  @ApiOperation({ summary: 'Get all active exchange rates between digital coins' })
  async getRates() {
    return this.fxService.getRateTable();
  }

  @Get('rate')
  @ApiOperation({ summary: 'Get exchange rate between two specific coins' })
  async getRate(
    @Query('from') from: DigitalCoin,
    @Query('to') to: DigitalCoin,
  ) {
    const rate = await this.fxService.getDisplayRate(from, to);
    return {
      fromCoin: from,
      toCoin: to,
      rate,
      rateDisplay: `1 ${from} = ${rate.toFixed(4)} ${to}`,
      inverseRate: 1 / rate,
      inverseRateDisplay: `1 ${to} = ${(1/rate).toFixed(4)} ${from}`,
    };
  }

  @Post('quote')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get a rate-locked quote for 30 seconds',
    description: 'Returns a quoteId that locks in the exchange rate. Must execute within 30 seconds.',
  })
  async getQuote(@Body() dto: GetQuoteDTO) {
    if (dto.direction === 'to') {
      // Reverse: user wants to receive a specific amount
      return this.fxService.convertReverse(
        dto.fromCoin,
        dto.toCoin,
        dto.amount,
        dto.feeType ?? 'p2p_cross_coin',
      );
    }
    return this.fxService.createQuote(
      dto.fromCoin,
      dto.toCoin,
      dto.amount,
      dto.feeType ?? 'p2p_cross_coin',
    );
  }

  @Post('quote/consume')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Execute a previously created quote',
    description: 'Consumes the locked quote. Can only be called once per quoteId.',
  })
  async consumeQuote(@Body() dto: ConsumeQuoteDTO) {
    return this.fxService.consumeQuote(dto.quoteId);
  }

  @Get('coins')
  @ApiOperation({ summary: 'List all digital coins in the Mondega ecosystem' })
  async getCoins() {
    const { getActiveCoins } = await import('@mondega/shared-types/currencies');
    return getActiveCoins().map(c => ({
      code: c.code,
      name: c.name,
      symbol: c.symbol,
      fiatPeg: c.fiatPeg,
      country: c.country,
      countryCode: c.countryCode,
      flag: c.flag,
      decimals: c.decimals,
      description: c.description,
      isActive: c.isActive,
    }));
  }
}
