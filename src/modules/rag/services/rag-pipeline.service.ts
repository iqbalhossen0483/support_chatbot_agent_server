import { Injectable, Logger } from '@nestjs/common';
import { Message } from '../../../entities/message.entity.js';
import { ConfidenceService } from './confidence.service.js';
import { LlmService } from './llm.service.js';
import { VectorSearchService } from './vector-search.service.js';

export interface RagResult {
  stream: AsyncGenerator<string>;
  confidenceScore: number;
  shouldEscalate: boolean;
  escalationReason?: string;
  sources: string[];
  chunkIds: string[];
}

@Injectable()
export class RagPipelineService {
  private readonly logger = new Logger(RagPipelineService.name);

  constructor(
    private readonly vectorSearch: VectorSearchService,
    private readonly llm: LlmService,
    private readonly confidence: ConfidenceService,
  ) {}

  async query(
    userQuery: string,
    websiteId: string,
    conversationHistory: Message[],
  ): Promise<RagResult> {
    // 1. Generate query embedding
    const queryEmbedding = await this.llm.generateEmbedding(userQuery);

    // 2. Vector search
    const chunks = await this.vectorSearch.search(queryEmbedding, websiteId);

    // 3. Extract sources
    const sources = chunks
      .map((c) => (c.chunk.metadata?.sourceUrl as string) || '')
      .filter(Boolean);
    const chunkIds = chunks.map((c) => c.chunk.id);

    // 4. Pre-check confidence (before LLM call)
    const preCheck = this.confidence.evaluate(userQuery, chunks, '');
    if (!preCheck.confident && !chunks.length) {
      // No relevant context at all — create escalation stream
      const escalationMessage =
        "I don't have enough information to answer this question accurately. Let me connect you with a support agent who can help.";

      async function* escalationStream(): AsyncGenerator<string> {
        yield await Promise.resolve(escalationMessage);
      }

      return {
        stream: escalationStream(),
        confidenceScore: preCheck.confidenceScore,
        shouldEscalate: true,
        escalationReason: preCheck.reason,
        sources: [],
        chunkIds: [],
      };
    }

    // 5. Generate response via LLM (streaming)
    const llmStream = this.llm.generateResponse(
      userQuery,
      chunks,
      conversationHistory,
    );

    // Wrap the stream to collect full response and evaluate confidence after
    let fullResponse = '';
    let evaluated = false;
    let finalConfidence = preCheck;
    const confidenceService = this.confidence;

    async function* wrappedStream(): AsyncGenerator<string> {
      for await (const token of llmStream) {
        fullResponse += token;
        yield token;
      }

      // Post-stream confidence evaluation
      finalConfidence = confidenceService.evaluate(
        userQuery,
        chunks,
        fullResponse,
      );
      evaluated = true;
    }

    const stream = wrappedStream();

    // Return a proxy that resolves confidence after streaming completes
    return {
      stream,
      get confidenceScore() {
        return evaluated
          ? finalConfidence.confidenceScore
          : preCheck.confidenceScore;
      },
      get shouldEscalate() {
        return evaluated ? !finalConfidence.confident : !preCheck.confident;
      },
      get escalationReason() {
        return evaluated ? finalConfidence.reason : preCheck.reason;
      },
      sources,
      chunkIds,
    };
  }
}
