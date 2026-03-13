import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiKeyGuard } from '../auth/guards/api-key.guard.js';
import { ChatService } from './chat.service.js';
import { CreateConversationDto } from './dto/create-conversation.dto.js';

@Controller('chat')
@UseGuards(ApiKeyGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('conversations')
  async createConversation(@Body() dto: CreateConversationDto) {
    const conversation = await this.chatService.createConversation(
      dto.websiteId,
      dto.sessionId,
      dto.visitorMetadata,
    );
    return {
      id: conversation.id,
      status: conversation.status,
      createdAt: conversation.created_at,
    };
  }

  @Get('conversations/:id')
  async getConversation(@Param('id', ParseIntPipe) id: number) {
    return this.chatService.getConversation(id);
  }
}
