import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Website, WebsiteStatus } from '../../../entities/website.entity.js';

interface RescrapeJobData {
  websiteId: number;
}

@Processor('rescrape-queue')
export class RescrapeProcessor extends WorkerHost {
  private readonly logger = new Logger(RescrapeProcessor.name);

  constructor(
    @InjectRepository(Website)
    private readonly websiteRepo: Repository<Website>,
    @InjectQueue('scraper-queue')
    private readonly scraperQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<RescrapeJobData>): Promise<void> {
    const { websiteId } = job.data;
    this.logger.log(`Starting scheduled rescrape for website ${websiteId}`);

    try {
      const website = await this.websiteRepo.findOne({
        where: { id: websiteId },
      });

      if (!website) {
        this.logger.warn(`Website ${websiteId} not found, skipping rescrape`);
        return;
      }

      if (website.status === WebsiteStatus.SCRAPING) {
        this.logger.warn(`Website ${websiteId} is already scraping, skipping`);
        return;
      }

      await this.websiteRepo.update(websiteId, {
        status: WebsiteStatus.SCRAPING,
      });

      await this.scraperQueue.add(
        'scrape',
        {
          websiteId: website.id,
          baseUrl: website.base_url,
          scrapeConfig: website.scrape_config,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: { age: 86400 },
          removeOnFail: { age: 604800 },
        },
      );

      this.logger.log(`Rescrape job enqueued for website ${websiteId}`);
    } catch (error) {
      this.logger.error(`Rescrape failed for ${websiteId}: ${error}`);
      throw error;
    }
  }
}
