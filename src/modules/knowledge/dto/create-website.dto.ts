import {
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
} from 'class-validator';

export class CreateWebsiteDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsUrl({ require_tld: false })
  baseUrl!: string;

  @IsOptional()
  @IsObject()
  scrapeConfig?: Record<string, unknown>;
}
