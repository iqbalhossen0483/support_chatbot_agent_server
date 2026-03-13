import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Chunk } from '../../entities/chunk.entity.js';
import { ConfidenceService } from './services/confidence.service.js';
import { LlmService } from './services/llm.service.js';
import { RagPipelineService } from './services/rag-pipeline.service.js';
import { VectorSearchService } from './services/vector-search.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Chunk])],
  providers: [
    VectorSearchService,
    LlmService,
    RagPipelineService,
    ConfidenceService,
  ],
  exports: [RagPipelineService, VectorSearchService, LlmService],
})
export class RagModule {}
