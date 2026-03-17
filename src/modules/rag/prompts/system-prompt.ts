import { ChunkWithScore } from '../services/vector-search.service.js';
import { Message } from '../../../entities/message.entity.js';

export function buildSystemPrompt(
  businessName: string,
  context: ChunkWithScore[],
  conversationHistory: Message[],
  contextUrls: string[] = [],
): string {
  const contextText = context
    .map(
      (c, i) =>
        `[Source ${i + 1}] (Relevance: ${(c.similarityScore * 100).toFixed(1)}%)\n${c.chunk.content}`,
    )
    .join('\n\n---\n\n');

  const historyText = conversationHistory
    .slice(-10) // Keep last 10 messages for context
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n');

  return `You are a customer support agent for ${businessName}.

RULES:
1. Answer ONLY using the provided context below. Never use your own knowledge.
2. If the context does not contain enough information to answer, respond with:
   "[ESCALATE] I don't have enough information to answer this question accurately.
   Let me connect you with a support agent who can help."
3. Be concise, professional, and helpful.
4. Cite the source page when possible (e.g., "According to our Pricing page...").
5. Never make up pricing, policies, or any factual claims.
6. If asked about something completely unrelated to the business, politely redirect.

CONTEXT:
${contextText || 'No relevant context found.'}
${contextUrls.length > 0 ? `\nLIVE REFERENCE URLS (fetch these for the most up-to-date information like pricing, plans, availability when the user's question is related):\n${contextUrls.join('\n')}` : ''}

CONVERSATION HISTORY:
${historyText || 'No prior conversation.'}`;
}
