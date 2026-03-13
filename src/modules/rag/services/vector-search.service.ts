import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chunk } from '../../../entities/chunk.entity.js';

export interface ChunkWithScore {
  chunk: Chunk;
  similarityScore: number;
}

interface ChunkRow {
  id: string;
  page_id: string;
  website_id: string;
  content: string;
  token_count: number;
  chunk_index: number;
  metadata: Record<string, unknown>;
  similarity: string;
}

@Injectable()
export class VectorSearchService {
  private readonly logger = new Logger(VectorSearchService.name);
  private readonly topK: number;
  private readonly similarityThreshold: number;

  constructor(
    @InjectRepository(Chunk)
    private readonly chunkRepo: Repository<Chunk>,
    config: ConfigService,
  ) {
    this.topK = config.get<number>('rag.vectorSearchTopK') || 7;
    this.similarityThreshold =
      config.get<number>('rag.vectorSimilarityThreshold') || 0.3;
  }

  async search(
    queryEmbedding: number[],
    websiteId: string,
    topK?: number,
  ): Promise<ChunkWithScore[]> {
    const limit = topK || this.topK;
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    const results: ChunkRow[] = await this.chunkRepo
      .createQueryBuilder('chunk')
      .select('chunk.*')
      .addSelect('1 - (chunk.embedding <=> :embedding::vector)', 'similarity')
      .where('chunk.website_id = :websiteId')
      .andWhere('chunk.embedding IS NOT NULL')
      .orderBy('chunk.embedding <=> :embedding::vector')
      .setParameters({ embedding: embeddingStr, websiteId })
      .limit(limit)
      .getRawMany<ChunkRow>();

    return results
      .filter((r) => parseFloat(r.similarity) >= this.similarityThreshold)
      .map((r) => ({
        chunk: {
          id: r.id,
          page_id: r.page_id,
          website_id: r.website_id,
          content: r.content,
          token_count: r.token_count,
          chunk_index: r.chunk_index,
          metadata: r.metadata,
        } as Chunk,
        similarityScore: parseFloat(r.similarity),
      }));
  }
}
