import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ConversationStatus } from '../../entities/conversation.entity.js';
import { MessageRole } from '../../entities/message.entity.js';
import { EscalationService } from '../escalation/escalation.service.js';
import { RagPipelineService } from '../rag/services/rag-pipeline.service.js';
import { ChatService } from './chat.service.js';

interface VisitorMessagePayload {
  conversationId: string;
  content: string;
}

interface AgentMessagePayload {
  escalationId: string;
  content: string;
}

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: '*' },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly ragPipeline: RagPipelineService,
    private readonly escalationService: EscalationService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join:conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    await client.join(`conversation:${data.conversationId}`);
    this.logger.log(
      `Client ${client.id} joined conversation ${data.conversationId}`,
    );
  }

  @SubscribeMessage('visitor:message')
  async handleVisitorMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: VisitorMessagePayload,
  ) {
    const { conversationId, content } = data;

    try {
      // Save user message
      await this.chatService.addMessage(
        conversationId,
        MessageRole.USER,
        content,
      );

      // Get conversation for context
      const conversation =
        await this.chatService.getConversation(conversationId);

      // If escalated, forward to agent room
      if (conversation.is_escalated) {
        this.server
          .to(`escalation:${conversationId}`)
          .emit('visitor:message', { conversationId, content });
        return;
      }

      // Run RAG pipeline
      const result = await this.ragPipeline.query(
        content,
        conversation.website_id,
        conversation.messages,
      );

      // Stream tokens
      let fullResponse = '';
      for await (const token of result.stream) {
        fullResponse += token;
        this.server
          .to(`conversation:${conversationId}`)
          .emit('ai:token', { content: token });
      }

      // Save assistant message
      const message = await this.chatService.addMessage(
        conversationId,
        MessageRole.ASSISTANT,
        fullResponse,
        result.confidenceScore,
        {
          sources: result.sources,
          chunkIds: result.chunkIds,
        },
      );

      // Emit metadata
      this.server.to(`conversation:${conversationId}`).emit('ai:metadata', {
        confidenceScore: result.confidenceScore,
        sources: result.sources,
      });

      // Check for escalation
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

        this.server.to(`conversation:${conversationId}`).emit('ai:escalation', {
          escalationId: escalation.id,
          message: 'A support agent will be with you shortly.',
        });

        // Notify agents
        this.server.emit('escalation:new', {
          escalationId: escalation.id,
          conversationId,
          summary: escalation.summary,
          priority: escalation.priority,
        });
      }

      // Stream complete
      this.server
        .to(`conversation:${conversationId}`)
        .emit('ai:done', { messageId: message.id });
    } catch (error) {
      this.logger.error(`Error processing message: ${error}`);
      client.emit('error', { message: 'Failed to process message' });
    }
  }

  @SubscribeMessage('agent:message')
  async handleAgentMessage(
    @ConnectedSocket() _client: Socket,
    @MessageBody() data: AgentMessagePayload,
  ) {
    const { escalationId, content } = data;

    try {
      const escalation =
        await this.escalationService.getEscalation(escalationId);
      const conversationId = escalation.conversation_id;

      // Save agent message
      await this.chatService.addMessage(
        conversationId,
        MessageRole.AGENT,
        content,
      );

      // Forward to visitor
      this.server
        .to(`conversation:${conversationId}`)
        .emit('agent:message', { content });
    } catch (error) {
      this.logger.error(`Error sending agent message: ${error}`);
    }
  }
}
