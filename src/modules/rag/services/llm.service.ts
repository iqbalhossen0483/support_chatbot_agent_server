import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Message } from '../../../entities/message.entity.js';
import { ChunkWithScore } from './vector-search.service.js';
import { buildSystemPrompt } from '../prompts/system-prompt.js';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly embeddingModel: string;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('gemini.apiKey') || '';
    this.model = config.get<string>('gemini.model') || 'gemini-2.0-flash';
    this.embeddingModel = config.get<string>('gemini.embeddingModel') || 'text-embedding-004';
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.embeddingModel}:embedContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${this.embeddingModel}`,
        content: { parts: [{ text }] },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Embedding API error: ${response.status} ${error}`);
    }

    const data = await response.json() as { embedding: { values: number[] } };
    return data.embedding.values;
  }

  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.embeddingModel}:batchEmbedContents?key=${this.apiKey}`;

    const requests = texts.map((text) => ({
      model: `models/${this.embeddingModel}`,
      content: { parts: [{ text }] },
    }));

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Batch embedding API error: ${response.status} ${error}`);
    }

    const data = await response.json() as { embeddings: { values: number[] }[] };
    return data.embeddings.map((e) => e.values);
  }

  async *generateResponse(
    query: string,
    context: ChunkWithScore[],
    conversationHistory: Message[],
    businessName: string = 'our company',
  ): AsyncGenerator<string> {
    const systemPrompt = buildSystemPrompt(businessName, context, conversationHistory);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:streamGenerateContent?alt=sse&key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: query }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LLM API error: ${response.status} ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim();
          if (!jsonStr || jsonStr === '[DONE]') continue;

          try {
            const parsed = JSON.parse(jsonStr) as {
              candidates?: { content?: { parts?: { text?: string }[] } }[];
            };
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              yield text;
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    }
  }
}
