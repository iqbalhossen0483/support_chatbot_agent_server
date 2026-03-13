import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { Chunk } from '../../../entities/chunk.entity.js';
import { Page, PageStatus } from '../../../entities/page.entity.js';
import { Website, WebsiteStatus } from '../../../entities/website.entity.js';
import { EmbeddingService } from '../services/embedding.service.js';

interface EmbeddingJobData {
  websiteId: number;
  pageId: number;
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
    @InjectRepository(Page)
    private readonly pageRepo: Repository<Page>,
  ) {
    super();
  }

  async process(job: Job<EmbeddingJobData>): Promise<void> {
    const { websiteId, pageId } = job.data;
    this.logger.log(`Starting embedding for page ${pageId}`);

    try {
      // Get chunks for this page without embeddings
      const chunks = await this.chunkRepo.find({
        where: { page_id: pageId },
        order: { chunk_index: 'ASC' },
      });

      const chunksToEmbed = chunks.filter((c) => !c.embedding);

      this.logger.log(
        `Generating embeddings for ${chunksToEmbed.length} chunks from page ${pageId}`,
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

      // Mark page as fully embedded
      await this.pageRepo.update(pageId, { status: PageStatus.EMBEDDED });

      this.logger.log(
        `Embedding complete for page ${pageId}: ${chunksToEmbed.length} chunks embedded`,
      );

      // Check if all pages for this website are fully embedded
      const pendingPages = await this.pageRepo.count({
        where: [
          { website_id: websiteId, status: PageStatus.PENDING },
          { website_id: websiteId, status: PageStatus.SCRAPED },
          { website_id: websiteId, status: PageStatus.CHUNKED },
        ],
      });

      if (pendingPages === 0) {
        await this.websiteRepo.update(websiteId, {
          status: WebsiteStatus.READY,
        });
        this.logger.log(`Website ${websiteId} is fully processed and READY`);
      }
    } catch (error: unknown) {
      this.logger.error(
        `Embedding generation failed for page ${pageId}: ${String(error)}`,
      );
      await this.websiteRepo.update(websiteId, {
        status: WebsiteStatus.ERROR,
      });
      throw error;
    }
  }
}
