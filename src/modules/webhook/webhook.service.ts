import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConversationStatus } from '../../entities/conversation.entity.js';
import { MessageRole } from '../../entities/message.entity.js';
import { ChatService } from '../chat/chat.service.js';
import { EscalationService } from '../escalation/escalation.service.js';
import { RagPipelineService } from '../rag/services/rag-pipeline.service.js';
import {
  ChatwootApiService,
  ChatwootConversationStatus,
} from './chatwoot-api.service.js';
import {
  ChatwootWebhookEvent,
  ChatwootWebhookPayload,
} from './dto/chatwoot-webhook.dto.js';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly websiteId: number;

  constructor(
    private readonly config: ConfigService,
    private readonly chatService: ChatService,
    private readonly ragPipeline: RagPipelineService,
    private readonly escalationService: EscalationService,
    private readonly chatwootApi: ChatwootApiService,
  ) {
    this.websiteId = this.config.get<number>('chatwoot.websiteId') || 0;
  }

  /**
   * Route webhook to the appropriate handler based on event type.
   */
  async handleWebhook(payload: ChatwootWebhookPayload): Promise<void> {
    const { event } = payload;
    this.logger.log(`Received Chatwoot webhook: ${event}`);

    switch (event) {
      case ChatwootWebhookEvent.MESSAGE_CREATED:
        await this.handleMessageCreated(payload);
        break;

      case ChatwootWebhookEvent.CONVERSATION_STATUS_CHANGED:
        await this.handleConversationStatusChanged(payload);
        break;

      default:
        this.logger.log(`Unhandled webhook event: ${event}`);
    }
  }

  /**
   * New message in a Chatwoot conversation.
   * Only process incoming (customer) messages — ignore outgoing (agent/bot).
   */
  private async handleMessageCreated(
    payload: ChatwootWebhookPayload,
  ): Promise<void> {
    // Only process incoming customer messages
    if (payload.message_type !== 'incoming') {
      return;
    }

    const chatwootConversationId = payload.conversation.id;
    const rawContent = payload.content;

    if (!rawContent) {
      return;
    }

    // Strip HTML tags from content (Chatwoot sends <p>text</p>)
    const content = rawContent.replace(/<[^>]*>/g, '').trim();

    if (!content) {
      return;
    }

    this.logger.log(
      `Incoming message in Chatwoot conversation ${chatwootConversationId}: "${content.substring(0, 50)}..."`,
    );

    const conversation = await this.findOrCreateConversation(
      chatwootConversationId,
      payload,
    );

    await this.processVisitorMessage(
      conversation.id,
      chatwootConversationId,
      content,
    );
  }

  /**
   * Conversation status changed in Chatwoot — sync to our system.
   */
  private async handleConversationStatusChanged(
    payload: ChatwootWebhookPayload,
  ): Promise<void> {
    const chatwootConversationId = payload.conversation.id;
    const status = payload.conversation.status;

    this.logger.log(
      `Chatwoot conversation ${chatwootConversationId} status: ${status}`,
    );

    const conversation = await this.findConversationByChatwootId(
      chatwootConversationId,
    );
    if (!conversation) return;

    if (status === 'resolved') {
      await this.chatService.updateConversationStatus(
        conversation.id,
        ConversationStatus.RESOLVED,
      );
    }
  }

  /**
   * Core: process visitor message through RAG pipeline and respond via Chatwoot API.
   */
  private async processVisitorMessage(
    conversationId: number,
    chatwootConversationId: number,
    content: string,
  ): Promise<void> {
    try {
      // Save user message
      await this.chatService.addMessage(
        conversationId,
        MessageRole.USER,
        content,
      );

      // Get conversation with history
      const conversation =
        await this.chatService.getConversation(conversationId);

      // If escalated, skip AI — human agent handles it in Chatwoot
      if (conversation.is_escalated) {
        this.logger.log(
          `Conversation ${chatwootConversationId} is escalated — skipping AI`,
        );
        return;
      }

      // Show typing indicator before generating response
      await this.chatwootApi.toggleTyping(chatwootConversationId, 'on');

      // Run RAG pipeline
      const result = await this.ragPipeline.query(
        content,
        conversation.website_id,
        conversation.messages,
      );

      // Collect full response from stream
      let fullResponse = '';
      for await (const token of result.stream) {
        fullResponse += token;
      }

      // Turn off typing indicator
      await this.chatwootApi.toggleTyping(chatwootConversationId, 'off');

      // Save assistant message
      await this.chatService.addMessage(
        conversationId,
        MessageRole.ASSISTANT,
        fullResponse,
        result.confidenceScore,
        {
          sources: result.sources,
          chunkIds: result.chunkIds,
          channel: 'chatwoot',
        },
      );

      // Send AI response back to Chatwoot
      await this.chatwootApi.sendMessage(chatwootConversationId, fullResponse);

      // Handle escalation
      if (result.shouldEscalate) {
        const escalation = await this.escalationService.createEscalation(
          conversationId,
          conversation.website_id,
          result.escalationReason || 'low_confidence',
          conversation.messages,
        );

        await this.chatService.updateConversationStatus(
          conversationId,
          ConversationStatus.ESCALATED,
        );

        this.logger.log(
          `Escalation ${escalation.id} created for Chatwoot conversation ${chatwootConversationId}`,
        );

        // Notify customer and mark conversation as pending for human agent
        await this.chatwootApi.sendMessage(
          chatwootConversationId,
          'Let me connect you with a support agent who can help further.',
        );
        await this.chatwootApi.toggleStatus(
          chatwootConversationId,
          ChatwootConversationStatus.Pending,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error processing message for Chatwoot conversation ${chatwootConversationId}: ${error}`,
      );

      // Fallback: notify visitor
      try {
        await this.chatwootApi.sendMessage(
          chatwootConversationId,
          "I'm having trouble processing your request. Let me connect you with a support agent.",
        );
        await this.chatwootApi.toggleStatus(
          chatwootConversationId,
          ChatwootConversationStatus.Pending,
        );
      } catch (fallbackError) {
        this.logger.error(`Fallback also failed: ${fallbackError}`);
      }
    }
  }

  private async findOrCreateConversation(
    chatwootConversationId: number,
    payload: ChatwootWebhookPayload,
  ) {
    const existing = await this.findConversationByChatwootId(
      chatwootConversationId,
    );
    if (existing) return existing;

    const sender = payload.sender;
    return this.chatService.createConversation(
      this.websiteId,
      `chatwoot:${chatwootConversationId}`,
      {
        source: 'chatwoot',
        chatwoot_conversation_id: chatwootConversationId,
        visitor_name: sender?.name || 'Visitor',
        visitor_email: sender?.email || null,
      },
    );
  }

  private async findConversationByChatwootId(chatwootConversationId: number) {
    try {
      return await this.chatService.findConversationBySessionId(
        `chatwoot:${chatwootConversationId}`,
      );
    } catch {
      return null;
    }
  }
}
