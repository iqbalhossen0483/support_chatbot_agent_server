import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Page } from '../../../entities/page.entity.js';
import { Website, WebsiteStatus } from '../../../entities/website.entity.js';

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(
    @InjectRepository(Website)
    private readonly websiteRepo: Repository<Website>,
    @InjectRepository(Page)
    private readonly pageRepo: Repository<Page>,
    @InjectQueue('scraper-queue')
    private readonly scraperQueue: Queue,
    @InjectQueue('rescrape-queue')
    private readonly rescrapeQueue: Queue,
  ) {}

  async registerWebsite(
    name: string,
    baseUrl: string,
    scrapeConfig: Record<string, unknown> = {},
  ) {
    // Generate API key
    const rawApiKey = `ak_live_${uuidv4().replace(/-/g, '')}`;
    const apiKeyHash = await bcrypt.hash(rawApiKey, 12);

    const website = this.websiteRepo.create({
      name,
      base_url: baseUrl,
      scrape_config: scrapeConfig,
      api_key_hash: apiKeyHash,
      status: WebsiteStatus.SCRAPING,
    });

    const saved = await this.websiteRepo.save(website);

    // Enqueue scraping job
    await this.scraperQueue.add(
      'scrape',
      {
        websiteId: saved.id,
        baseUrl: saved.base_url,
        scrapeConfig: saved.scrape_config,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { age: 86400 },
        removeOnFail: { age: 604800 },
      },
    );

    this.logger.log(`Website registered and scraping started: ${saved.id}`);

    return {
      id: saved.id,
      name: saved.name,
      baseUrl: saved.base_url,
      status: saved.status,
      apiKey: rawApiKey, // Only returned once
      createdAt: saved.created_at,
    };
  }

  async listWebsites() {
    return this.websiteRepo.find({
      order: { created_at: 'DESC' },
      select: [
        'id',
        'name',
        'base_url',
        'status',
        'total_pages',
        'total_chunks',
        'last_scraped_at',
        'created_at',
      ],
    });
  }

  async getWebsite(id: string) {
    const website = await this.websiteRepo.findOne({ where: { id } });
    if (!website) throw new NotFoundException('Website not found');
    return website;
  }

  async triggerRescrape(id: string) {
    const website = await this.getWebsite(id);

    await this.websiteRepo.update(id, { status: WebsiteStatus.SCRAPING });

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
      },
    );

    this.logger.log(`Re-scrape triggered for website: ${id}`);
    return { message: 'Re-scrape initiated' };
  }

  async deleteWebsite(id: string) {
    const website = await this.getWebsite(id);
    await this.websiteRepo.remove(website);
    this.logger.log(`Website deleted: ${id}`);
    return { message: 'Website and all associated data deleted' };
  }

  async getPages(websiteId: string) {
    return this.pageRepo.find({
      where: { website_id: websiteId },
      select: [
        'id',
        'url',
        'title',
        'status',
        'http_status',
        'content_hash',
        'created_at',
      ],
      order: { created_at: 'ASC' },
    });
  }

  async getStats(websiteId: string) {
    const website = await this.getWebsite(websiteId);
    const pageCount = await this.pageRepo.count({
      where: { website_id: websiteId },
    });

    return {
      websiteId: website.id,
      name: website.name,
      status: website.status,
      totalPages: website.total_pages,
      totalChunks: website.total_chunks,
      pagesInDb: pageCount,
      lastScrapedAt: website.last_scraped_at,
    };
  }
}
