import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export enum ChatwootConversationStatus {
  Open = 'open',
  Resolved = 'resolved',
  Pending = 'pending',
}

type SendMessageResponse = {
  id: number;
};

@Injectable()
export class ChatwootApiService {
  private readonly logger = new Logger(ChatwootApiService.name);
  private readonly baseUrl: string;
  private readonly apiToken: string;
  private readonly accountId: string;

  constructor(private readonly config: ConfigService) {
    const base = this.config.get<string>('chatwoot.baseUrl') || '';
    this.apiToken = this.config.get<string>('chatwoot.apiAccessToken') || '';
    this.accountId = this.config.get<string>('chatwoot.accountId') || '';
    this.baseUrl = `${base}/api/v1/accounts/${this.accountId}`;
  }

  /**
   * Send a message to a Chatwoot conversation.
   * POST /api/v1/accounts/{account_id}/conversations/{conversation_id}/messages
   */
  async sendMessage(
    conversationId: number,
    text: string,
  ): Promise<number | null> {
    const url = `${this.baseUrl}/conversations/${conversationId}/messages`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          api_access_token: this.apiToken,
        },
        body: JSON.stringify({
          content: text,
          message_type: 'outgoing',
          private: false,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(
          `Chatwoot send message error [${response.status}]: ${errorBody}`,
        );
        return null;
      }

      const data = (await response.json()) as SendMessageResponse;
      this.logger.log(
        `Message sent to Chatwoot conversation ${conversationId}`,
      );
      return data.id;
    } catch (error) {
      this.logger.error(`Failed to send message to Chatwoot: ${error}`);
      return null;
    }
  }

  /**
   * Toggle conversation status (open, resolved, pending).
   * POST /api/v1/accounts/{account_id}/conversations/{conversation_id}/toggle_status
   */
  async toggleStatus(
    conversationId: number,
    status: ChatwootConversationStatus,
  ): Promise<boolean> {
    const url = `${this.baseUrl}/conversations/${conversationId}/toggle_status`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          api_access_token: this.apiToken,
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(
          `Chatwoot toggle_status error [${response.status}]: ${errorBody}`,
        );
        return false;
      }

      this.logger.log(
        `Conversation ${conversationId} status set to: ${status}`,
      );
      return true;
    } catch (error) {
      this.logger.error(`Failed to toggle status: ${error}`);
      return false;
    }
  }

  /**
   * Toggle typing indicator on/off.
   * POST /api/v1/accounts/{account_id}/conversations/{conversation_id}/toggle_typing_status
   */
  async toggleTyping(
    conversationId: number,
    status: 'on' | 'off',
  ): Promise<void> {
    const url = `${this.baseUrl}/conversations/${conversationId}/toggle_typing_status`;

    try {
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          api_access_token: this.apiToken,
        },
        body: JSON.stringify({ typing_status: status, is_private: false }),
      });
    } catch (error) {
      this.logger.warn(`Failed to toggle typing: ${error}`);
    }
  }
}
