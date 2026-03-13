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
  websiteId: number;
  pageId: number;
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
    const { websiteId, pageId } = job.data;
    this.logger.log(`Starting chunking for page ${pageId}`);

    try {
      const page = await this.pageRepo.findOne({ where: { id: pageId } });
      if (!page || !page.clean_text) {
        this.logger.warn(`Page ${pageId} not found or has no content`);
        return;
      }

      // Delete old chunks for this page
      await this.chunkRepo.delete({ page_id: pageId });

      const chunkResults = await this.chunkingService.chunkContent(
        page.clean_text,
        page.url,
        page.title || '',
      );

      const chunkEntities = chunkResults.map((result) =>
        this.chunkRepo.create({
          page_id: pageId,
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

      // Update page status
      await this.pageRepo.update(pageId, { status: PageStatus.CHUNKED });

      // Update website chunk count
      const totalChunks = await this.chunkRepo.count({
        where: { website_id: websiteId },
      });
      await this.websiteRepo.update(websiteId, { total_chunks: totalChunks });

      this.logger.log(
        `Chunking complete for page ${pageId}: ${chunkEntities.length} chunks`,
      );

      // Immediately push to embedding queue
      await this.embeddingQueue.add(
        'embed',
        { websiteId, pageId },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: { age: 86400 },
          removeOnFail: { age: 604800 },
        },
      );
    } catch (error) {
      this.logger.error(`Chunking failed for page ${pageId}: ${error}`);
      throw error;
    }
  }
}
