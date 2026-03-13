import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ScrapeConfigDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  maxDepth?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  maxPages?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  rateLimit?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludePaths?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includePaths?: string[];
}

export class CreateWebsiteDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsUrl({ require_tld: false })
  baseUrl!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ScrapeConfigDto)
  scrapeConfig?: ScrapeConfigDto;
}
