import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CreateWebsiteDto } from './dto/create-website.dto.js';
import { KnowledgeService } from './services/knowledge.service.js';

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
      dto.brandContext,
    );
  }

  @Get('websites')
  async listWebsites() {
    return this.knowledgeService.listWebsites();
  }

  @Get('websites/:id')
  async getWebsite(@Param('id', ParseIntPipe) id: number) {
    return this.knowledgeService.getWebsite(id);
  }

  @Patch('websites/:id/brand-context')
  async updateBrandContext(
    @Param('id', ParseIntPipe) id: number,
    @Body('brandContext') brandContext: string,
  ) {
    await this.knowledgeService.updateBrandContext(id, brandContext);
    return { success: true };
  }

  @Post('websites/:id/scrape')
  async triggerRescrape(@Param('id', ParseIntPipe) id: number) {
    return this.knowledgeService.triggerRescrape(id);
  }

  @Delete('websites/:id')
  async deleteWebsite(@Param('id', ParseIntPipe) id: number) {
    return this.knowledgeService.deleteWebsite(id);
  }

  @Get('websites/:id/pages')
  async getPages(@Param('id', ParseIntPipe) id: number) {
    return this.knowledgeService.getPages(id);
  }

  @Get('websites/:id/stats')
  async getStats(@Param('id', ParseIntPipe) id: number) {
    return this.knowledgeService.getStats(id);
  }
}
