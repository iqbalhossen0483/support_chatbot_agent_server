import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Request } from 'express';
import { Repository } from 'typeorm';
import { Website, WebsiteStatus } from '../../../entities/website.entity.js';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    @InjectRepository(Website)
    private readonly websiteRepo: Repository<Website>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers['x-api-key'] as string;

    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    // Find website by checking all API key hashes
    // For better performance in production, use a prefix-based lookup
    const websites = await this.websiteRepo.find({
      where: { status: WebsiteStatus.READY },
    });

    for (const website of websites) {
      console.log(apiKey, website.api_key_hash);
      const isMatch = await bcrypt.compare(apiKey, website.api_key_hash);
      if (isMatch) {
        request.website = website;
        return true;
      }
    }

    throw new UnauthorizedException('Invalid API key');
  }
}
