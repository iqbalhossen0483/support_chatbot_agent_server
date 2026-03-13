import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Escalation } from '../../entities/escalation.entity.js';
import { Conversation } from '../../entities/conversation.entity.js';
import { Message } from '../../entities/message.entity.js';
import { EscalationController } from './escalation.controller.js';
import { EscalationService } from './escalation.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Escalation, Conversation, Message]),
    AuthModule,
  ],
  controllers: [EscalationController],
  providers: [EscalationService],
  exports: [EscalationService],
})
export class EscalationModule {}
