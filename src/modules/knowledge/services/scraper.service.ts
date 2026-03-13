import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import puppeteer, { Browser } from 'puppeteer';

export interface ScrapedPage {
  url: string;
  title: string;
  content: string;
  html: string;
}

// File extensions that indicate static assets with no useful content
const STATIC_ASSET_EXTENSIONS = new Set([
  '.js',
  '.css',
  '.map',
  '.json',
  '.xml',
  '.rss',
  '.atom',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.ico',
  '.webp',
  '.avif',
  '.bmp',
  '.tiff',
  '.mp4',
  '.webm',
  '.mp3',
  '.ogg',
  '.wav',
  '.flac',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.otf',
  '.pdf',
  '.zip',
  '.tar',
  '.gz',
  '.rar',
  '.7z',
  '.exe',
  '.dmg',
  '.apk',
  '.msi',
]);

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
export class ScraperService implements OnModuleDestroy {
  private readonly logger = new Logger(ScraperService.name);
  private readonly maxDepth: number;
  private readonly maxPages: number;
  private readonly rateLimit: number;
  private readonly pageTimeout: number;
  private browser: Browser | null = null;

  constructor(config: ConfigService) {
    this.maxDepth = config.get<number>('scraper.maxDepth') || 10;
    this.maxPages = config.get<number>('scraper.maxPages') || 5000;
    this.rateLimit = config.get<number>('scraper.rateLimit') || 2;
    this.pageTimeout = config.get<number>('scraper.pageTimeout') || 30000;
  }

  private async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.connected) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });
    }
    return this.browser;
  }

  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
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

      // Skip static assets and framework bundles (no useful content)
      if (this.isStaticAsset(parsed)) return false;

      return true;
    } catch {
      return false;
    }
  }

  private isStaticAsset(parsed: URL): boolean {
    const pathname = parsed.pathname.toLowerCase();
    const segments = pathname.split('/').filter(Boolean);

    // Skip any URL with a path segment starting with _ (e.g. /_nuxt/, /_next/, /_app/)
    if (segments.some((seg) => seg.startsWith('_'))) return true;

    // Skip sitemap paths
    if (segments.some((seg) => seg.startsWith('sitemap'))) return true;

    // Check file extension
    const lastSegment = segments[segments.length - 1] || '';
    const dotIndex = lastSegment.lastIndexOf('.');
    if (dotIndex !== -1) {
      const ext = lastSegment.slice(dotIndex);
      if (STATIC_ASSET_EXTENSIONS.has(ext)) return true;
    }

    return false;
  }

  async scrapeUrl(url: string): Promise<ScrapedPage | null> {
    if (!this.validateUrl(url)) {
      this.logger.warn(`Blocked URL: ${url}`);
      return null;
    }

    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      // Block unnecessary resources — we only want text content
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const type = req.resourceType();
        if (['image', 'stylesheet', 'font', 'media', 'other'].includes(type)) {
          void req.abort();
        } else {
          void req.continue();
        }
      });

      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: this.pageTimeout,
      });

      // Extract title
      const title = await page.title();

      // Get raw HTML for link extraction
      const html = (await page.content()).replace(/\0/g, '');

      // Extract clean text content from the page
      const content = await page.evaluate(() => {
        // Remove unwanted elements
        const selectorsToRemove = [
          'script',
          'style',
          'noscript',
          'iframe',
          'nav',
          'footer',
          'header',
          '[role="navigation"]',
          '[role="banner"]',
          '[aria-hidden="true"]',
          '.cookie-banner',
          '.popup',
          '.modal',
          '.advertisement',
          '.ads',
          '.sidebar',
        ];

        for (const selector of selectorsToRemove) {
          document.querySelectorAll(selector).forEach((el) => el.remove());
        }

        // Get text from body
        const body = document.querySelector('body');
        if (!body) return '';

        return body.innerText
          .replace(/\t/g, ' ')
          .replace(/\n{3,}/g, '\n\n')
          .replace(/[ ]{2,}/g, ' ')
          .trim();
      });

      if (!content || content.length < 50) {
        this.logger.warn(`Insufficient content from ${url}`);
        return null;
      }

      return { url, title: title.replace(/\0/g, ''), content, html };
    } catch (error) {
      this.logger.error(`Failed to scrape ${url}: ${error}`);
      return null;
    } finally {
      await page.close();
    }
  }

  getMaxDepth() {
    return this.maxDepth;
  }
  getMaxPages() {
    return this.maxPages;
  }
  getRateLimit() {
    return this.rateLimit;
  }
}
