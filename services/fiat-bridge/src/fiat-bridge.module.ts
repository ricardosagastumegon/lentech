// ============================================================
// LEN — Fiat Bridge NestJS Module
// ============================================================

import { Module }              from '@nestjs/common';
import { ConfigModule }        from '@nestjs/config';
import { TypeOrmModule }       from '@nestjs/typeorm';
import { BullModule }          from '@nestjs/bull';
import { FiatBridgeService }   from './fiat-bridge.service';
import { FiatBridgeController } from './fiat-bridge.controller';
import { VirtualAccountService } from './virtual-account.service';
import { FiatTransaction }     from './entities/fiat-transaction.entity';
import { VirtualAccount }      from './entities/virtual-account.entity';
import { BanruralProvider }    from './providers/banrural.provider';
import { SPEIProvider }        from './providers/spei.provider';
import { BACProvider }         from './providers/bac.provider';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type:        'postgres',
        url:          process.env['DATABASE_URL'],
        ssl:          process.env['NODE_ENV'] === 'production'
                        ? { rejectUnauthorized: false }
                        : false,
        entities:    [FiatTransaction, VirtualAccount],
        synchronize: process.env['NODE_ENV'] !== 'production', // migrations in prod
        logging:     process.env['NODE_ENV'] === 'development',
      }),
    }),
    TypeOrmModule.forFeature([FiatTransaction, VirtualAccount]),
    BullModule.forRootAsync({
      useFactory: () => ({
        redis: {
          host: process.env['REDIS_HOST'] ?? 'localhost',
          port: parseInt(process.env['REDIS_PORT'] ?? '6379'),
          password: process.env['REDIS_PASSWORD'],
        },
      }),
    }),
    BullModule.registerQueue(
      { name: 'fiat-bridge' },
      { name: 'transactions' },
    ),
  ],
  controllers: [FiatBridgeController],
  providers: [
    FiatBridgeService,
    VirtualAccountService,
    BanruralProvider,
    SPEIProvider,
    BACProvider,
  ],
  exports: [FiatBridgeService, VirtualAccountService],
})
export class FiatBridgeModule {}
