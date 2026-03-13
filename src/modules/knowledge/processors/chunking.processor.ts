import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job, Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { Chunk } from '../../../entities/chunk.entity.js';
import { Page, PageStatus } from '../../../entities/page.entity.js';
import { Website } from '../../../entities/website.entity.js';
import { ChunkingService } from '../services/chunking.service.js';

interface ChunkingJobData {
  websiteId: string;
}

@Processor('chunking-queue')
export class ChunkingProcessor extends WorkerHost {
  private readonly logger = new Logger(ChunkingProcessor.name);

  constructor(
    private readonly chunkingService: ChunkingService,
    @InjectRepository(Page)
    private readonly pageRepo: Repository<Page>,
    @InjectRepository(Chunk)
    private readonly chunkRepo: Repository<Chunk>,
    @InjectRepository(Website)
    private readonly websiteRepo: Repository<Website>,
    @InjectQueue('embedding-queue')
    private readonly embeddingQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<ChunkingJobData>): Promise<void> {
    const { websiteId } = job.data;
    this.logger.log(`Starting chunking for website ${websiteId}`);

    try {
      // Delete old chunks for this website
      await this.chunkRepo.delete({ website_id: websiteId });

      // Get all scraped pages
      const pages = await this.pageRepo.find({
        where: { website_id: websiteId, status: PageStatus.SCRAPED },
      });

      let totalChunks = 0;

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        if (!page.clean_text) continue;

        const chunkResults = await this.chunkingService.chunkContent(
          page.clean_text,
          page.url,
          page.title || '',
        );

        const chunkEntities = chunkResults.map((result) =>
          this.chunkRepo.create({
            page_id: page.id,
            website_id: websiteId,
            content: result.text,
            token_count: result.tokenCount,
            chunk_index: result.chunkIndex,
            metadata: {
              sourceUrl: result.pageUrl,
              sourceTitle: result.pageTitle,
            },
          }),
        );

        await this.chunkRepo.save(chunkEntities);
        totalChunks += chunkEntities.length;

        // Update page status
        await this.pageRepo.update(page.id, { status: PageStatus.CHUNKED });

        // Update progress
        await job.updateProgress(Math.round(((i + 1) / pages.length) * 100));
      }

      // Update website stats
      await this.websiteRepo.update(websiteId, {
        total_chunks: totalChunks,
      });

      this.logger.log(
        `Chunking complete for ${websiteId}: ${totalChunks} chunks from ${pages.length} pages`,
      );

      // Enqueue embedding job
      await this.embeddingQueue.add(
        'embed',
        { websiteId },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: { age: 86400 },
          removeOnFail: { age: 604800 },
        },
      );
    } catch (error) {
      this.logger.error(`Chunking failed for ${websiteId}: ${error}`);
      throw error;
    }
  }
}
