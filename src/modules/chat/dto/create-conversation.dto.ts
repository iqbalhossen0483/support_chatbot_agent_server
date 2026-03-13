import { IsString, IsUUID, IsOptional, IsObject } from 'class-validator';

export class CreateConversationDto {
  @IsUUID()
  websiteId!: string;

  @IsString()
  sessionId!: string;

  @IsOptional()
  @IsObject()
  visitorMetadata?: Record<string, unknown>;
}
