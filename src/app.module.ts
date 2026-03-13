import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';

import appConfig from './config/app.config.js';
import bullmqConfig from './config/bullmq.config.js';
import databaseConfig from './config/database.config.js';
import geminiConfig from './config/gemini.config.js';
import ragConfig from './config/rag.config.js';
import redisConfig from './config/redis.config.js';
import scraperConfig from './config/scraper.config.js';

import { Chunk } from './entities/chunk.entity.js';
import { Conversation } from './entities/conversation.entity.js';
import { Escalation } from './entities/escalation.entity.js';
import { Message } from './entities/message.entity.js';
import { Page } from './entities/page.entity.js';
import { User } from './entities/user.entity.js';
import { Website } from './entities/website.entity.js';

import { AuthModule } from './modules/auth/auth.module.js';
import { ChatModule } from './modules/chat/chat.module.js';
import { EscalationModule } from './modules/escalation/escalation.module.js';
import { KnowledgeModule } from './modules/knowledge/knowledge.module.js';
import { RagModule } from './modules/rag/rag.module.js';
import { WebsiteModule } from './modules/website/website.module.js';

@Module({
  imports: [
    // Global config
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        databaseConfig,
        redisConfig,
        bullmqConfig,
        geminiConfig,
        scraperConfig,
        ragConfig,
      ],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        database: config.get<string>('database.name'),
        username: config.get<string>('database.user'),
        password: config.get<string>('database.password'),
        ssl: config.get<boolean>('database.ssl')
          ? { rejectUnauthorized: false }
          : false,
        entities: [
          Website,
          Page,
          Chunk,
          Conversation,
          Message,
          Escalation,
          User,
        ],
        synchronize: config.get<string>('app.env') === 'development',
        logging:
          config.get<string>('app.env') === 'development' ? ['error'] : false,
      }),
    }),

    // BullMQ
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('redis.host'),
          port: config.get<number>('redis.port'),
          password: config.get<string>('redis.password') || undefined,
        },
      }),
    }),

    // Rate limiting
    ThrottlerModule.forRoot({
      throttlers: [
        { name: 'short', ttl: 60000, limit: 30 },
        { name: 'medium', ttl: 60000, limit: 100 },
      ],
    }),

    // Feature modules
    AuthModule,
    ChatModule,
    KnowledgeModule,
    RagModule,
    EscalationModule,
    WebsiteModule,
  ],
})
export class AppModule {}
