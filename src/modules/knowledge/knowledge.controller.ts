import { Controller, Post, Get, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { KnowledgeService } from './services/knowledge.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CreateWebsiteDto } from './dto/create-website.dto.js';

@Controller('knowledge')
@UseGuards(JwtAuthGuard)
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Post('websites')
  async registerWebsite(@Body() dto: CreateWebsiteDto) {
    return this.knowledgeService.registerWebsite(
      dto.name,
      dto.baseUrl,
      dto.scrapeConfig,
    );
  }

  @Get('websites')
  async listWebsites() {
    return this.knowledgeService.listWebsites();
  }

  @Get('websites/:id')
  async getWebsite(@Param('id') id: string) {
    return this.knowledgeService.getWebsite(id);
  }

  @Post('websites/:id/scrape')
  async triggerRescrape(@Param('id') id: string) {
    return this.knowledgeService.triggerRescrape(id);
  }

  @Delete('websites/:id')
  async deleteWebsite(@Param('id') id: string) {
    return this.knowledgeService.deleteWebsite(id);
  }

  @Get('websites/:id/pages')
  async getPages(@Param('id') id: string) {
    return this.knowledgeService.getPages(id);
  }

  @Get('websites/:id/stats')
  async getStats(@Param('id') id: string) {
    return this.knowledgeService.getStats(id);
  }
}
