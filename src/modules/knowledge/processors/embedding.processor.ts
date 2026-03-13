import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { Chunk } from '../../../entities/chunk.entity.js';
import { Website, WebsiteStatus } from '../../../entities/website.entity.js';
import { EmbeddingService } from '../services/embedding.service.js';

interface EmbeddingJobData {
  websiteId: string;
}

@Processor('embedding-queue')
export class EmbeddingProcessor extends WorkerHost {
  private readonly logger = new Logger(EmbeddingProcessor.name);
  private readonly batchSize = 100;

  constructor(
    private readonly embeddingService: EmbeddingService,
    @InjectRepository(Chunk)
    private readonly chunkRepo: Repository<Chunk>,
    @InjectRepository(Website)
    private readonly websiteRepo: Repository<Website>,
  ) {
    super();
  }

  async process(job: Job<EmbeddingJobData>): Promise<void> {
    const { websiteId } = job.data;
    this.logger.log(`Starting embedding generation for website ${websiteId}`);

    try {
      // Get all chunks without embeddings
      const chunks = await this.chunkRepo.find({
        where: { website_id: websiteId },
        order: { chunk_index: 'ASC' },
      });

      const chunksToEmbed = chunks.filter((c) => !c.embedding);

      this.logger.log(
        `Generating embeddings for ${chunksToEmbed.length} chunks`,
      );

      // Process in batches
      for (let i = 0; i < chunksToEmbed.length; i += this.batchSize) {
        const batch = chunksToEmbed.slice(i, i + this.batchSize);
        const texts = batch.map((c) => c.content);

        const embeddings =
          await this.embeddingService.generateBatchEmbeddings(texts);

        // Update chunks with embeddings
        for (let j = 0; j < batch.length; j++) {
          await this.chunkRepo.update(batch[j].id, {
            embedding: embeddings[j],
          });
        }

        // Update progress
        const processed = Math.min(i + this.batchSize, chunksToEmbed.length);
        await job.updateProgress(
          Math.round((processed / chunksToEmbed.length) * 100),
        );
      }

      // Mark website as ready
      await this.websiteRepo.update(websiteId, {
        status: WebsiteStatus.READY,
      });

      this.logger.log(
        `Embedding complete for ${websiteId}: ${chunksToEmbed.length} chunks embedded`,
      );
    } catch (error) {
      this.logger.error(
        `Embedding generation failed for ${websiteId}: ${error}`,
      );
      await this.websiteRepo.update(websiteId, {
        status: WebsiteStatus.ERROR,
      });
      throw error;
    }
  }
}
