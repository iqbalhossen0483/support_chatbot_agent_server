import { BullModule } from '@nestjs/bullmq';
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Chunk } from '../../entities/chunk.entity.js';
import { Page } from '../../entities/page.entity.js';
import { Website } from '../../entities/website.entity.js';
import { AuthModule } from '../auth/auth.module.js';
import { RagModule } from '../rag/rag.module.js';
import { KnowledgeController } from './knowledge.controller.js';
import { ChunkingService } from './services/chunking.service.js';
import { EmbeddingService } from './services/embedding.service.js';
import { KnowledgeService } from './services/knowledge.service.js';
import { ScraperService } from './services/scraper.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Website, Page, Chunk]),
    BullModule.registerQueue(
      { name: 'scraper-queue' },
      { name: 'chunking-queue' },
      { name: 'embedding-queue' },
      { name: 'rescrape-queue' },
    ),
    AuthModule,
    forwardRef(() => RagModule),
  ],
  controllers: [KnowledgeController],
  providers: [
    KnowledgeService,
    ScraperService,
    ChunkingService,
    EmbeddingService,
  ],
  exports: [KnowledgeService, EmbeddingService],
})
export class KnowledgeModule {}
