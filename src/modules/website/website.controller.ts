import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { WebsiteService } from './website.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@Controller('websites')
@UseGuards(JwtAuthGuard)
export class WebsiteController {
  constructor(private readonly websiteService: WebsiteService) {}

  @Get()
  async findAll() {
    return this.websiteService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.websiteService.findById(id);
  }
}
