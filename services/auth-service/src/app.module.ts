import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { JwtModule } from '@nestjs/jwt';
import { BullModule } from '@nestjs/bull';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { KYCModule } from './modules/kyc/kyc.module';
import { User } from './modules/users/entities/user.entity';
import { KYCDocument } from './modules/kyc/entities/kyc-document.entity';
import { Session } from './modules/auth/entities/session.entity';
import { OTPCode } from './modules/auth/entities/otp-code.entity';

@Module({
  imports: [
    // Config — loads .env files
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // PostgreSQL connection via TypeORM
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        entities: [User, KYCDocument, Session, OTPCode],
        synchronize: config.get('NODE_ENV') === 'development', // NEVER in production
        logging: config.get('NODE_ENV') === 'development',
        ssl: config.get('NODE_ENV') === 'production'
          ? { rejectUnauthorized: true }
          : false,
        extra: {
          max: 20,        // Connection pool max
          min: 5,         // Connection pool min
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        },
      }),
      inject: [ConfigService],
    }),

    // Redis-based rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        ttl: config.get<number>('RATE_LIMIT_TTL', 60),
        limit: config.get<number>('RATE_LIMIT_AUTH_MAX', 10),
      }),
      inject: [ConfigService],
    }),

    // Bull queues (Redis-backed) for async jobs
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get<string>('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),

    // Feature modules
    AuthModule,
    UsersModule,
    KYCModule,
  ],
})
export class AppModule {}
