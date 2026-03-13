import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from '../../entities/conversation.entity.js';
import { Message } from '../../entities/message.entity.js';
import { Website } from '../../entities/website.entity.js';
import { ChatController } from './chat.controller.js';
import { ChatService } from './chat.service.js';
import { ChatGateway } from './chat.gateway.js';
import { AuthModule } from '../auth/auth.module.js';
import { RagModule } from '../rag/rag.module.js';
import { EscalationModule } from '../escalation/escalation.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, Message, Website]),
    AuthModule,
    forwardRef(() => RagModule),
    forwardRef(() => EscalationModule),
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}
