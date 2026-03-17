import { registerAs } from '@nestjs/config';

export default registerAs('chatwoot', () => ({
  // Chatwoot instance base URL (e.g. https://app.chatwoot.com or self-hosted)
  baseUrl: process.env.CHATWOOT_BASE_URL || 'https://app.chatwoot.com',

  // API access token (from Chatwoot Settings → Account Settings)
  apiAccessToken: process.env.CHATWOOT_API_ACCESS_TOKEN || '',

  // Chatwoot Account ID
  accountId: process.env.CHATWOOT_ACCOUNT_ID || '',

  // The website ID in our system that this Chatwoot integration maps to
  websiteId: parseInt(process.env.CHATWOOT_WEBSITE_ID || '0', 10),

  // Webhook verification token (optional, for HMAC signature verification)
  webhookToken: process.env.CHATWOOT_WEBHOOK_TOKEN || '',

  // Whether the webhook integration is enabled
  enabled: process.env.CHATWOOT_ENABLED === 'true',
}));
