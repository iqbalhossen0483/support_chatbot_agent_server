import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Chunk } from '../../../entities/chunk.entity.js';

export interface ChunkWithScore {
  chunk: Chunk;
  similarityScore: number;
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
    this.similarityThreshold = config.get<number>('rag.vectorSimilarityThreshold') || 0.3;
  }

  async search(
    queryEmbedding: number[],
    websiteId: string,
    topK?: number,
  ): Promise<ChunkWithScore[]> {
    const limit = topK || this.topK;
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    const results = await this.chunkRepo.query(
      `SELECT *, 1 - (embedding <=> $1::vector) AS similarity
       FROM chunks
       WHERE website_id = $2
         AND embedding IS NOT NULL
       ORDER BY embedding <=> $1::vector
       LIMIT $3`,
      [embeddingStr, websiteId, limit],
    );

    return results
      .filter((r: any) => r.similarity >= this.similarityThreshold)
      .map((r: any) => ({
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
