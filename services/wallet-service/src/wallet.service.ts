// ============================================================
// MONDEGA DIGITAL — Wallet Service
// Manages wallets, balances, addresses, transaction history
// ============================================================

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { ethers } from 'ethers';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import axios from 'axios';
import { WalletEntity } from './entities/wallet.entity';
import { TransactionEntity } from './entities/transaction.entity';
import { generateId, fromMondgUnits, toMondgUnits, safeSub, safeAdd, isValidAddress, isValidPhone } from '@mondega/shared-utils';
import { TransactionType, TransactionStatus, Currency } from '@mondega/shared-types';

// Polygon provider
const MONDG_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];

const CACHE_TTL = 30; // seconds — balance cache
const LOCK_TTL = 30;  // seconds — transaction lock

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);
  private readonly provider: ethers.JsonRpcProvider;
  private readonly contract: ethers.Contract;

  constructor(
    @InjectRepository(WalletEntity)
    private readonly walletRepo: Repository<WalletEntity>,
    @InjectRepository(TransactionEntity)
    private readonly txRepo: Repository<TransactionEntity>,
    @InjectRedis()
    private readonly redis: Redis,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
    @InjectQueue('transactions')
    private readonly txQueue: Queue,
    @InjectQueue('notifications')
    private readonly notificationQueue: Queue,
  ) {
    this.provider = new ethers.JsonRpcProvider(
      this.config.get<string>('POLYGON_RPC_URL'),
    );
    this.contract = new ethers.Contract(
      this.config.get<string>('MONDEGA_CONTRACT_ADDRESS', '0x'),
      MONDG_ABI,
      this.provider,
    );
  }

  // ---- Wallet Creation ----

  async createWallet(userId: string): Promise<WalletEntity> {
    // Check if user already has a wallet
    const existing = await this.walletRepo.findOne({ where: { userId } });
    if (existing) return existing;

    // Generate new Polygon wallet using MPC (simplified: direct generation for dev)
    // In production: call Fireblocks MPC API
    const wallet = ethers.Wallet.createRandom();

    const walletEntity = this.walletRepo.create({
      id: generateId('wal'),
      userId,
      address: wallet.address,
      // NOTE: In production, private key is NEVER stored here.
      // It goes to the MPC/HSM system immediately.
      balanceMondg: '0',
      balanceReservedMondg: '0',
      totalReceivedMondg: '0',
      totalSentMondg: '0',
      transactionCount: 0,
      isActive: true,
    });

    await this.walletRepo.save(walletEntity);
    this.logger.log(`Created wallet for user ${userId}: ${wallet.address}`);
    return walletEntity;
  }

  // ---- Balance ----

  async getBalance(userId: string): Promise<{
    balanceMondg: string;
    balanceMondgFormatted: string;
    balanceReservedMondg: string;
    availableMondg: string;
    balanceInCurrencies: Record<string, string>;
  }> {
    const wallet = await this.getWalletByUserId(userId);

    // Check Redis cache first
    const cacheKey = `balance:${wallet.address}`;
    const cached = await this.redis.get(cacheKey);

    let balanceMondg: string;
    if (cached) {
      balanceMondg = cached;
    } else {
      // Get on-chain balance (source of truth)
      try {
        const onChainBalance = await this.contract['balanceOf'](wallet.address) as bigint;
        balanceMondg = onChainBalance.toString();
        // Sync DB with on-chain balance
        await this.walletRepo.update({ id: wallet.id }, { balanceMondg });
        // Cache for 30 seconds
        await this.redis.setex(cacheKey, CACHE_TTL, balanceMondg);
      } catch {
        // Fallback to DB balance if blockchain is slow
        balanceMondg = wallet.balanceMondg;
        this.logger.warn(`Blockchain unavailable, using cached balance for ${wallet.address}`);
      }
    }

    const balanceBig = BigInt(balanceMondg);
    const reservedBig = BigInt(wallet.balanceReservedMondg);
    const availableBig = balanceBig - reservedBig;

    return {
      balanceMondg,
      balanceMondgFormatted: fromMondgUnits(balanceBig),
      balanceReservedMondg: wallet.balanceReservedMondg,
      availableMondg: availableBig < 0n ? '0' : availableBig.toString(),
      // FX conversion handled by FX Engine — placeholders here
      balanceInCurrencies: {
        GTQ: '0',
        MXN: '0',
        USD: '0',
      },
    };
  }

  // ---- Transfers ----

  async initiateTransfer(params: {
    fromUserId: string;
    toIdentifier: string;  // Phone, username, or address
    amountMondg: string;
    description?: string;
    feeType: string;
  }): Promise<TransactionEntity> {
    const fromWallet = await this.getWalletByUserId(params.fromUserId);

    // Resolve recipient
    const toWallet = await this.resolveRecipient(params.toIdentifier);

    // Convert human amount to units
    const amountUnits = toMondgUnits(params.amountMondg);
    const feeUnits = amountUnits / 1000n * 3n; // 0.3% fee placeholder
    const totalUnits = amountUnits + feeUnits;

    // Acquire distributed lock to prevent double-spend
    const lockKey = `lock:wallet:${fromWallet.address}`;
    const lockValue = generateId('lk');
    const locked = await this.redis.set(lockKey, lockValue, 'EX', LOCK_TTL, 'NX');

    if (!locked) {
      throw new BadRequestException('Another transaction is already in progress. Please wait.');
    }

    try {
      // Check balance
      const available = BigInt(fromWallet.balanceMondg) - BigInt(fromWallet.balanceReservedMondg);
      if (available < totalUnits) {
        throw new BadRequestException('Insufficient MONDG balance.');
      }

      // Use DB transaction for atomicity
      return await this.dataSource.transaction(async (manager) => {
        // Reserve balance
        await manager.update(WalletEntity, { id: fromWallet.id }, {
          balanceReservedMondg: safeAdd(
            fromWallet.balanceReservedMondg,
            totalUnits.toString(),
          ),
        });

        // Create transaction record
        const tx = manager.create(TransactionEntity, {
          id: generateId('tx'),
          type: TransactionType.TRANSFER,
          status: TransactionStatus.PENDING,
          fromUserId: params.fromUserId,
          toUserId: toWallet.userId,
          fromWalletAddress: fromWallet.address,
          toWalletAddress: toWallet.address,
          amountMondg: amountUnits.toString(),
          feeMondg: feeUnits.toString(),
          description: params.description,
          confirmations: 0,
        });

        await manager.save(TransactionEntity, tx);

        this.logger.log(`Transfer initiated: ${tx.id} | ${fromWallet.address} -> ${toWallet.address} | ₳${params.amountMondg}`);

        // Queue blockchain execution (async)
        // In production: emit to Kafka -> TX Engine picks up
        void this.executeOnChain(tx.id, fromWallet.address, toWallet.address, amountUnits);

        return tx;
      });
    } finally {
      // Release lock only if we still own it
      const currentLock = await this.redis.get(lockKey);
      if (currentLock === lockValue) {
        await this.redis.del(lockKey);
      }
    }
  }

  // ---- Blockchain Execution ----

  private async executeOnChain(
    txId: string,
    fromAddress: string,
    toAddress: string,
    amount: bigint,
  ): Promise<void> {
    try {
      await this.txRepo.update({ id: txId }, { status: TransactionStatus.PROCESSING });

      // In production: use MPC wallet signing via Fireblocks
      // Here: simplified for development
      const signerKey = this.config.get<string>('DEPLOYER_PRIVATE_KEY');
      if (!signerKey) throw new Error('Signer key not configured');

      const signer = new ethers.Wallet(signerKey, this.provider);
      const contractWithSigner = this.contract.connect(signer) as ethers.Contract;

      const txResponse = await contractWithSigner['transfer'](toAddress, amount) as ethers.TransactionResponse;

      await this.txRepo.update({ id: txId }, {
        status: TransactionStatus.CONFIRMING,
        txHash: txResponse.hash,
      });

      // Wait for 3 confirmations
      const receipt = await txResponse.wait(3);

      if (!receipt) throw new Error('Transaction receipt is null');

      // Update transaction as completed
      await this.dataSource.transaction(async (manager) => {
        await manager.update(TransactionEntity, { id: txId }, {
          status: TransactionStatus.COMPLETED,
          blockNumber: receipt.blockNumber,
          confirmations: 3,
          completedAt: new Date(),
        });

        // Release reserved balance and update totals
        const fromWallet = await manager.findOne(WalletEntity, { where: { address: fromAddress } });
        const toWallet = await manager.findOne(WalletEntity, { where: { address: toAddress } });

        if (fromWallet) {
          const newBalance = safeSub(fromWallet.balanceMondg, amount.toString());
          const newReserved = safeSub(fromWallet.balanceReservedMondg, amount.toString());
          await manager.update(WalletEntity, { id: fromWallet.id }, {
            balanceMondg: newBalance,
            balanceReservedMondg: newReserved,
            totalSentMondg: safeAdd(fromWallet.totalSentMondg, amount.toString()),
            transactionCount: fromWallet.transactionCount + 1,
          });
        }

        if (toWallet) {
          await manager.update(WalletEntity, { id: toWallet.id }, {
            balanceMondg: safeAdd(toWallet.balanceMondg, amount.toString()),
            totalReceivedMondg: safeAdd(toWallet.totalReceivedMondg, amount.toString()),
            transactionCount: toWallet.transactionCount + 1,
          });
        }
      });

      // Invalidate balance cache
      await this.redis.del(`balance:${fromAddress}`);
      await this.redis.del(`balance:${toAddress}`);

      // Emit transaction-completed event to Kafka → notification service picks up
      await this.txQueue.add('transaction-completed', {
        transactionId: txId,
        txHash: txResponse.hash,
        blockNumber: receipt.blockNumber,
        timestamp: new Date(),
      });

      // Notify sender and receiver
      await this.notificationQueue.add('transaction-notification', {
        transactionId: txId,
        type: 'TRANSFER_COMPLETED',
        fromAddress,
        toAddress,
        amount: amount.toString(),
      });

      this.logger.log(`Transaction completed: ${txId} | Hash: ${txResponse.hash}`);

    } catch (error) {
      const reason = (error as Error).message ?? 'Unknown error';
      this.logger.error(`Transaction failed: ${txId} — ${reason}`, error);
      await this.txRepo.update({ id: txId }, {
        status: TransactionStatus.FAILED,
        failedReason: reason.slice(0, 500),
      });
      // Notify user of failure
      await this.notificationQueue.add('transaction-notification', {
        transactionId: txId,
        type: 'TRANSFER_FAILED',
        fromAddress,
        reason,
      });
    }
  }

  // ---- Transaction History ----

  async getTransactionHistory(userId: string, page: number = 1, limit: number = 20) {
    const wallet = await this.getWalletByUserId(userId);
    const [transactions, total] = await this.txRepo.findAndCount({
      where: [
        { fromUserId: userId },
        { toUserId: userId },
      ],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: transactions.map(tx => this.sanitizeTx(tx, userId)),
      total,
      page,
      limit,
      hasMore: total > page * limit,
    };
  }

  // ---- Helpers ----

  async getWalletByUserId(userId: string): Promise<WalletEntity> {
    const wallet = await this.walletRepo.findOne({ where: { userId, isActive: true } });
    if (!wallet) throw new NotFoundException('Wallet not found.');
    return wallet;
  }

  private async resolveRecipient(identifier: string): Promise<WalletEntity> {
    const trimmed = identifier.trim();

    // 1. Wallet address (0x...)
    if (isValidAddress(trimmed)) {
      const wallet = await this.walletRepo.findOne({ where: { address: trimmed, isActive: true } });
      if (!wallet) throw new NotFoundException('Recipient wallet address not registered in Mondega.');
      return wallet;
    }

    // 2. Phone number — resolve userId via auth-service internal API
    if (isValidPhone(trimmed)) {
      return this.resolveByPhone(trimmed);
    }

    // 3. User external ID (usr_...)
    if (trimmed.startsWith('usr_')) {
      const wallet = await this.walletRepo.findOne({ where: { userId: trimmed, isActive: true } });
      if (!wallet) throw new NotFoundException('Recipient user has no active wallet.');
      return wallet;
    }

    throw new BadRequestException('Recipient must be a phone number (+E.164), wallet address (0x...), or user ID (usr_...).');
  }

  private async resolveByPhone(phone: string): Promise<WalletEntity> {
    // Cache lookup first — phone→userId resolved by auth service
    const cacheKey = `phone:wallet:${phone}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      const wallet = await this.walletRepo.findOne({ where: { userId: cached, isActive: true } });
      if (wallet) return wallet;
    }

    // Call auth-service internal API to resolve phone → userId
    const authServiceUrl = this.config.get<string>('AUTH_SERVICE_URL', 'http://localhost:3001');
    let userId: string;

    try {
      const res = await axios.get<{ userId: string }>(
        `${authServiceUrl}/internal/users/by-phone`,
        {
          params: { phoneNumber: phone },
          headers: { 'X-Internal-Secret': this.config.get('INTERNAL_API_SECRET', '') },
          timeout: 3000,
        },
      );
      userId = res.data.userId;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        throw new NotFoundException(`No Mondega account found for phone ${phone.slice(0, 6)}...`);
      }
      this.logger.error(`Auth service phone resolution failed: ${(err as Error).message}`);
      throw new BadRequestException('Unable to resolve recipient. Please try again.');
    }

    // Cache for 5 minutes
    await this.redis.setex(cacheKey, 300, userId);

    const wallet = await this.walletRepo.findOne({ where: { userId, isActive: true } });
    if (!wallet) throw new NotFoundException('Recipient has no active Mondega wallet.');
    return wallet;
  }

  private sanitizeTx(tx: TransactionEntity, requestingUserId: string) {
    const isSender = tx.fromUserId === requestingUserId;
    return {
      id: tx.id,
      type: tx.type,
      status: tx.status,
      direction: isSender ? 'sent' : 'received',
      amountMondg: fromMondgUnits(BigInt(tx.amountMondg)),
      feeMondg: fromMondgUnits(BigInt(tx.feeMondg)),
      description: tx.description,
      txHash: tx.txHash,
      confirmations: tx.confirmations,
      createdAt: tx.createdAt,
      completedAt: tx.completedAt,
    };
  }
}
