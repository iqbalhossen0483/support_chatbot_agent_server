import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Website } from '../../entities/website.entity.js';

@Injectable()
export class WebsiteService {
  constructor(
    @InjectRepository(Website)
    private readonly websiteRepo: Repository<Website>,
  ) {}

  async findById(id: string): Promise<Website> {
    const website = await this.websiteRepo.findOne({ where: { id } });
    if (!website) throw new NotFoundException('Website not found');
    return website;
  }

  async findAll(): Promise<Website[]> {
    return this.websiteRepo.find({ order: { created_at: 'DESC' } });
  }
}
