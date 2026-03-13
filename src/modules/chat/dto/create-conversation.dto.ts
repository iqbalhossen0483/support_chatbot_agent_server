import { IsString, IsInt, IsOptional, IsObject } from 'class-validator';

export class CreateConversationDto {
  @IsInt()
  websiteId!: number;

  @IsString()
  sessionId!: string;

  @IsOptional()
  @IsObject()
  visitorMetadata?: Record<string, unknown>;
}
