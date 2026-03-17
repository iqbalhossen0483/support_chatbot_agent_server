import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
  chunkIds: number[];
}

@Injectable()
export class RagPipelineService {
  private readonly logger = new Logger(RagPipelineService.name);
  private readonly contextUrls: string[];

  constructor(
    private readonly vectorSearch: VectorSearchService,
    private readonly llm: LlmService,
    private readonly confidence: ConfidenceService,
    private readonly config: ConfigService,
  ) {
    this.contextUrls = this.config.get<string[]>('rag.contextUrls') || [];
  }

  async query(
    userQuery: string,
    websiteId: number,
    conversationHistory: Message[],
  ): Promise<RagResult> {
    // 1. Rewrite query using conversation history (resolve pronouns/context)
    const rewrittenQuery = await this.llm.rewriteQuery(
      userQuery,
      conversationHistory,
    );

    // 2. Generate query embedding from rewritten query
    const queryEmbedding = await this.llm.generateEmbedding(rewrittenQuery);

    // 3. Vector search
    const chunks = await this.vectorSearch.search(queryEmbedding, websiteId);

    // 4. Extract sources
    const sources = [...new Set(chunks.map((c) => c.sourceUrl).filter(Boolean))];
    const chunkIds = chunks.map((c) => c.chunk.id);

    // 5. Pre-check confidence (before LLM call)
    const preCheck = this.confidence.evaluate(rewrittenQuery, chunks, '');

    // 6. Always let the LLM handle the query — it knows how to handle greetings,
    // small talk, and abuse even without context. Only the LLM should decide
    // to escalate via [ESCALATE] in its response.
    const llmStream = this.llm.generateResponse(
      userQuery,
      chunks,
      conversationHistory,
      'our company',
      this.contextUrls,
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
        rewrittenQuery,
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
