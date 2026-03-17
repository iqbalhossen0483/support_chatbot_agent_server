import { Module, forwardRef } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module.js';
import { EscalationModule } from '../escalation/escalation.module.js';
import { RagModule } from '../rag/rag.module.js';
import { ChatwootApiService } from './chatwoot-api.service.js';
import { WebhookController } from './webhook.controller.js';
import { WebhookService } from './webhook.service.js';

@Module({
  imports: [
    ChatModule,
    forwardRef(() => RagModule),
    forwardRef(() => EscalationModule),
  ],
  controllers: [WebhookController],
  providers: [WebhookService, ChatwootApiService],
  exports: [WebhookService],
})
export class WebhookModule {}
