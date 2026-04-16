// ============================================================
// MONDEGA DIGITAL — Card Controller
// ============================================================

import {
  Controller, Post, Get, Patch, Body, Param, Query,
  Req, HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';
import { CardService } from './card.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { IssueCardDTO } from './dto/issue-card.dto';
import { SetCardStatusDTO } from './dto/set-card-status.dto';
import { GetTransactionsDTO } from './dto/get-transactions.dto';
import { PomeloAuthWebhookDTO } from './dto/pomelo-webhook.dto';

@ApiTags('cards')
@Controller()
export class CardController {
  constructor(private readonly cardService: CardService) {}

  // ---- Issue card ----

  @Post('cards')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Issue a new virtual or physical Mastercard' })
  @ApiResponse({ status: 201, description: 'Card issued successfully' })
  @ApiResponse({ status: 400, description: 'User already has an active card of that type' })
  async issueCard(@Req() req: Request, @Body() dto: IssueCardDTO) {
    const userId = (req.user as { userId: string }).userId;
    return this.cardService.issueCard({ ...dto, userId });
  }

  // ---- List cards ----

  @Get('cards')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all cards for the authenticated user' })
  async listCards(@Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    return this.cardService.listCards(userId);
  }

  // ---- Get single card ----

  @Get('cards/:cardId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get card details (masked PAN)' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  async getCard(@Req() req: Request, @Param('cardId') cardId: string) {
    const userId = (req.user as { userId: string }).userId;
    return this.cardService.getCard(userId, cardId);
  }

  // ---- Freeze / Unfreeze ----

  @Patch('cards/:cardId/status')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Freeze or unfreeze a card' })
  @ApiResponse({ status: 204, description: 'Status updated' })
  @ApiResponse({ status: 400, description: 'Card is blocked and cannot be modified' })
  async setStatus(
    @Req() req: Request,
    @Param('cardId') cardId: string,
    @Body() dto: SetCardStatusDTO,
  ) {
    const userId = (req.user as { userId: string }).userId;
    await this.cardService.setStatus(userId, cardId, dto.action);
  }

  // ---- Reveal PAN/CVV (virtual only) ----

  @Post('cards/:cardId/reveal')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reveal full PAN and CVV for online use (virtual cards only)' })
  @ApiResponse({ status: 200, description: 'Sensitive card data' })
  @ApiResponse({ status: 404, description: 'Virtual card not found' })
  async revealCard(@Req() req: Request, @Param('cardId') cardId: string) {
    const userId = (req.user as { userId: string }).userId;
    return this.cardService.revealCardDetails(userId, cardId);
  }

  // ---- Transaction history ----

  @Get('cards/:cardId/transactions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get paginated transaction history for a card' })
  async getTransactions(
    @Req() req: Request,
    @Param('cardId') cardId: string,
    @Query() query: GetTransactionsDTO,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return this.cardService.getTransactions(userId, cardId, query.page, query.limit);
  }

  // ---- Pomelo Authorization Webhook ----

  @Post('webhooks/pomelo/authorization')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pomelo JIT authorization webhook — approve or reject transaction' })
  async pomeloAuthorization(@Body() dto: PomeloAuthWebhookDTO) {
    return this.cardService.handlePomeloAuthorization(dto);
  }
}
