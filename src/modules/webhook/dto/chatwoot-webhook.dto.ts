export interface ChatwootWebhookPayload {
  event: ChatwootWebhookEvent;
  id: number;
  content: string;
  content_type: string;
  content_attributes: Record<string, unknown>;
  additional_attributes: Record<string, unknown>;
  message_type: 'incoming' | 'outgoing' | 'template';
  private: boolean;
  source_id: string | null;
  created_at: string;
  account: ChatwootAccount;
  conversation: ChatwootConversation;
  inbox: ChatwootInbox;
  sender?: ChatwootSender;
}

export interface ChatwootConversation {
  id: number;
  status: string;
  channel: string;
  inbox_id: number;
  can_reply: boolean;
  unread_count: number;
  first_reply_created_at: string | null;
  priority: string | null;
  waiting_since: number;
  agent_last_seen_at: number;
  contact_last_seen_at: number;
  last_activity_at: number;
  timestamp: number;
  created_at: number;
  updated_at: number;
  additional_attributes: Record<string, unknown>;
  custom_attributes: Record<string, unknown>;
  labels: string[];
  snoozed_until: string | null;
  contact_inbox?: ChatwootContactInbox;
  meta?: ChatwootConversationMeta;
  messages?: unknown[];
}

export interface ChatwootContactInbox {
  id: number;
  contact_id: number;
  inbox_id: number;
  source_id: string;
  created_at: string;
  updated_at: string;
  hmac_verified: boolean;
  pubsub_token: string;
}

export interface ChatwootConversationMeta {
  sender: Record<string, unknown>;
  assignee: Record<string, unknown> | null;
  assignee_type: string | null;
  team: string | null;
  hmac_verified: boolean;
}

export interface ChatwootInbox {
  id: number;
  name: string;
}

export interface ChatwootAccount {
  id: number;
  name: string;
}

export interface ChatwootSender {
  id: number;
  name: string;
  email: string | null;
  phone_number: string | null;
  identifier: string | null;
  thumbnail: string;
  avatar: string;
  blocked: boolean;
  additional_attributes: Record<string, unknown>;
  custom_attributes: Record<string, unknown>;
  account: ChatwootAccount;
}

export enum ChatwootWebhookEvent {
  MESSAGE_CREATED = 'message_created',
  MESSAGE_UPDATED = 'message_updated',
  CONVERSATION_CREATED = 'conversation_created',
  CONVERSATION_STATUS_CHANGED = 'conversation_status_changed',
  CONVERSATION_UPDATED = 'conversation_updated',
  WEBWIDGET_TRIGGERED = 'webwidget_triggered',
}
