import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job, Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { Page, PageStatus } from '../../../entities/page.entity.js';
import { Website, WebsiteStatus } from '../../../entities/website.entity.js';
import { ScraperService } from '../services/scraper.service.js';

interface ScrapeJobData {
  websiteId: number;
  baseUrl: string;
  scrapeConfig: Record<string, unknown>;
}

@Processor('scraper-queue')
export class ScraperProcessor extends WorkerHost {
  private readonly logger = new Logger(ScraperProcessor.name);

  constructor(
    private readonly scraperService: ScraperService,
    @InjectRepository(Website)
    private readonly websiteRepo: Repository<Website>,
    @InjectRepository(Page)
    private readonly pageRepo: Repository<Page>,
    @InjectQueue('chunking-queue')
    private readonly chunkingQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<ScrapeJobData>): Promise<void> {
    const { websiteId, baseUrl } = job.data;
    this.logger.log(`Starting scrape for website ${websiteId}: ${baseUrl}`);

    try {
      const visited = new Set<string>();
      const toVisit = [baseUrl];
      const maxPages = this.scraperService.getMaxPages();
      const maxDepth = this.scraperService.getMaxDepth();
      const rateLimit = this.scraperService.getRateLimit();
      let pagesScraped = 0;

      while (toVisit.length > 0 && pagesScraped < maxPages) {
        const url = toVisit.shift();
        if (!url || visited.has(url)) continue;
        visited.add(url);

        if (!this.scraperService.validateUrl(url)) continue;

        // Check depth
        const depth = this.getDepth(url, baseUrl);
        if (depth > maxDepth) continue;

        // Skip already scraped pages
        const existingPage = await this.pageRepo.findOne({
          where: { website_id: websiteId, url },
        });
        if (existingPage && existingPage.status === PageStatus.SCRAPED) {
          this.logger.debug(`Skipping already scraped: ${url}`);
          continue;
        }

        const result = await this.scraperService.scrapeUrl(url);
        if (!result) continue;

        // Save page
        let page = existingPage;

        if (page) {
          page.title = result.title;
          page.raw_html = result.html;
          page.clean_text = result.content;
          page.status = PageStatus.SCRAPED;
          page.http_status = 200;
        } else {
          page = this.pageRepo.create({
            website_id: websiteId,
            url,
            title: result.title,
            raw_html: result.html,
            clean_text: result.content,
            status: PageStatus.SCRAPED,
            http_status: 200,
          });
        }

        await this.pageRepo.save(page);
        pagesScraped++;

        // Immediately push this page to chunking queue
        await this.chunkingQueue.add(
          'chunk',
          { websiteId, pageId: page.id },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: { age: 86400 },
            removeOnFail: { age: 604800 },
          },
        );

        // Update progress
        await job.updateProgress(Math.round((pagesScraped / maxPages) * 100));

        // Extract links from same domain
        const links = this.extractLinks(result.html, baseUrl);
        for (const link of links) {
          if (!visited.has(link)) {
            toVisit.push(link);
          }
        }

        // Rate limiting
        if (rateLimit > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000 / rateLimit));
        }
      }

      // Update website stats
      await this.websiteRepo.update(websiteId, {
        total_pages: pagesScraped,
        last_scraped_at: new Date(),
      });

      this.logger.log(
        `Scrape complete for ${websiteId}: ${pagesScraped} pages`,
      );
    } catch (error) {
      this.logger.error(`Scrape failed for ${websiteId}: ${error}`);
      await this.websiteRepo.update(websiteId, {
        status: WebsiteStatus.ERROR,
      });
      throw error;
    }
  }

  private getDepth(url: string, baseUrl: string): number {
    try {
      const base = new URL(baseUrl);
      const target = new URL(url);
      const baseParts = base.pathname.split('/').filter(Boolean);
      const targetParts = target.pathname.split('/').filter(Boolean);
      return targetParts.length - baseParts.length;
    } catch {
      return Infinity;
    }
  }

  private extractLinks(html: string, baseUrl: string): string[] {
    const links: string[] = [];
    const baseHost = new URL(baseUrl).hostname;
    const regex = /href=["']([^"']+)["']/gi;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(html)) !== null) {
      try {
        const resolved = new URL(match[1], baseUrl).href;
        const parsed = new URL(resolved);

        // Same domain only, no fragments, no query params for dedup
        if (
          parsed.hostname === baseHost &&
          ['http:', 'https:'].includes(parsed.protocol)
        ) {
          const clean = `${parsed.origin}${parsed.pathname}`;
          // Skip early if the URL won't pass validation (static assets, etc.)
          if (this.scraperService.validateUrl(clean)) {
            links.push(clean);
          }
        }
      } catch {
        // Skip invalid URLs
      }
    }

    return [...new Set(links)];
  }
}
