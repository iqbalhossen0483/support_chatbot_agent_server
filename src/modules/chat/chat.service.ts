import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Conversation,
  ConversationStatus,
} from '../../entities/conversation.entity.js';
import { Message, MessageRole } from '../../entities/message.entity.js';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
  ) {}

  async createConversation(
    websiteId: string,
    sessionId: string,
    visitorMetadata: Record<string, unknown> = {},
  ): Promise<Conversation> {
    const conversation = this.conversationRepo.create({
      website_id: websiteId,
      session_id: sessionId,
      visitor_metadata: visitorMetadata,
      status: ConversationStatus.ACTIVE,
    });
    return this.conversationRepo.save(conversation);
  }

  async getConversation(id: string): Promise<Conversation> {
    const conversation = await this.conversationRepo.findOne({
      where: { id },
      relations: ['messages'],
      order: { messages: { created_at: 'ASC' } },
    });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    return conversation;
  }

  async addMessage(
    conversationId: string,
    role: MessageRole,
    content: string,
    confidenceScore?: number | null,
    metadata: Record<string, unknown> = {},
  ): Promise<Message> {
    const message = this.messageRepo.create({
      conversation_id: conversationId,
      role,
      content,
      confidence_score: confidenceScore ?? null,
      metadata,
    });

    const saved = await this.messageRepo.save(message);

    await this.conversationRepo.increment(
      { id: conversationId },
      'message_count',
      1,
    );

    return saved;
  }

  async getConversationMessages(conversationId: string): Promise<Message[]> {
    return this.messageRepo.find({
      where: { conversation_id: conversationId },
      order: { created_at: 'ASC' },
    });
  }

  async updateConversationStatus(
    id: string,
    status: ConversationStatus,
  ): Promise<void> {
    await this.conversationRepo.update(id, {
      status,
      ...(status === ConversationStatus.RESOLVED
        ? { closed_at: new Date() }
        : {}),
      ...(status === ConversationStatus.ESCALATED
        ? { is_escalated: true }
        : {}),
    });
  }
}
