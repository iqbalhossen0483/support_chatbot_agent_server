import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  RawBody,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import type { ChatwootWebhookPayload } from './dto/chatwoot-webhook.dto.js';
import { WebhookService } from './webhook.service.js';

@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);
  private readonly webhookToken: string;

  constructor(
    private readonly webhookService: WebhookService,
    private readonly config: ConfigService,
  ) {
    this.webhookToken = this.config.get<string>('chatwoot.webhookToken') || '';
  }

  /**
   * POST /v1/webhooks/chatwoot
   *
   * Receives webhook events from Chatwoot.
   * Verifies HMAC-SHA256 signature, then processes async.
   */
  @Post('chatwoot')
  @HttpCode(HttpStatus.OK)
  handleChatwootWebhook(
    @Body() payload: ChatwootWebhookPayload,
    @Headers('x-chatwoot-signature') signature: string,
    @Headers('x-chatwoot-timestamp') timestamp: string,
    @RawBody() rawBody: Buffer,
  ): { ok: true } {
    // Verify HMAC signature if webhook token is configured
    // Formula: sha256=HMAC-SHA256(secret, "{timestamp}.{raw_body}")
    if (this.webhookToken && signature) {
      const message = `${timestamp}.${rawBody.toString()}`;
      const expectedSignature =
        'sha256=' +
        createHmac('sha256', this.webhookToken).update(message).digest('hex');

      if (signature !== expectedSignature) {
        this.logger.warn('Invalid Chatwoot webhook signature');
        throw new UnauthorizedException('Invalid webhook signature');
      }
    }

    // Process async — respond immediately so Chatwoot doesn't retry
    this.webhookService.handleWebhook(payload).catch((error) => {
      this.logger.error(`Webhook processing failed: ${error}`);
    });

    return { ok: true };
  }
}
