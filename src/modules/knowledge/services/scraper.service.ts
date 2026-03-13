import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ScrapedPage {
  url: string;
  title: string;
  content: string;
  html: string;
}

// Private IP ranges to block (SSRF protection)
const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^0\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
];

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);
  private readonly maxDepth: number;
  private readonly maxPages: number;
  private readonly rateLimit: number;
  private readonly userAgent: string;
  private readonly pageTimeout: number;

  constructor(config: ConfigService) {
    this.maxDepth = config.get<number>('scraper.maxDepth') || 10;
    this.maxPages = config.get<number>('scraper.maxPages') || 5000;
    this.rateLimit = config.get<number>('scraper.rateLimit') || 2;
    this.userAgent = config.get<string>('scraper.userAgent') || 'SupportAgentBot/1.0';
    this.pageTimeout = config.get<number>('scraper.pageTimeout') || 30000;
  }

  validateUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) return false;

      const hostname = parsed.hostname;
      for (const pattern of PRIVATE_IP_PATTERNS) {
        if (pattern.test(hostname)) return false;
      }
      if (hostname === 'localhost') return false;

      return true;
    } catch {
      return false;
    }
  }

  // Placeholder — full Puppeteer/Cheerio implementation will go in the worker
  async scrapeUrl(url: string): Promise<ScrapedPage | null> {
    if (!this.validateUrl(url)) {
      this.logger.warn(`Blocked URL: ${url}`);
      return null;
    }

    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': this.userAgent },
        signal: AbortSignal.timeout(this.pageTimeout),
      });

      if (!response.ok) {
        this.logger.warn(`HTTP ${response.status} for ${url}`);
        return null;
      }

      const html = await response.text();
      const title = this.extractTitle(html);
      const content = this.extractText(html);

      return { url, title, content, html };
    } catch (error) {
      this.logger.error(`Failed to scrape ${url}: ${error}`);
      return null;
    }
  }

  private extractTitle(html: string): string {
    const match = html.match(/<title[^>]*>(.*?)<\/title>/i);
    return match?.[1]?.trim() || '';
  }

  private extractText(html: string): string {
    return html
      // Remove script/style tags and content
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      // Remove remaining HTML tags
      .replace(/<[^>]+>/g, ' ')
      // Decode common entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  getMaxDepth() { return this.maxDepth; }
  getMaxPages() { return this.maxPages; }
  getRateLimit() { return this.rateLimit; }
}
