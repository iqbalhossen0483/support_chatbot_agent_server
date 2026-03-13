import { registerAs } from '@nestjs/config';

export default registerAs('scraper', () => ({
  maxDepth: parseInt(process.env.SCRAPER_MAX_DEPTH || '10', 10),
  maxPages: parseInt(process.env.SCRAPER_MAX_PAGES || '5000', 10),
  rateLimit: parseInt(process.env.SCRAPER_RATE_LIMIT || '2', 10),
  userAgent: process.env.SCRAPER_USER_AGENT || 'SupportAgentBot/1.0',
  pageTimeout: 30000,
}));
