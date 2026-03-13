import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ChunkResult {
  text: string;
  tokenCount: number;
  chunkIndex: number;
  pageUrl: string;
  pageTitle: string;
}

@Injectable()
export class ChunkingService {
  private readonly logger = new Logger(ChunkingService.name);
  private readonly chunkSizeMin: number;
  private readonly chunkSizeMax: number;
  private readonly chunkOverlap: number;

  // gpt-tokenizer will be dynamically imported since it's ESM
  private encode!: (text: string) => number[];
  private decode!: (tokens: number[]) => string;
  private initialized = false;

  constructor(config: ConfigService) {
    this.chunkSizeMin = config.get<number>('rag.chunkSizeMin') || 500;
    this.chunkSizeMax = config.get<number>('rag.chunkSizeMax') || 600;
    this.chunkOverlap = config.get<number>('rag.chunkOverlap') || 50;
  }

  private async ensureInitialized() {
    if (this.initialized) return;
    const tokenizer = await import('gpt-tokenizer');
    this.encode = tokenizer.encode;
    this.decode = tokenizer.decode;
    this.initialized = true;
  }

  async chunkContent(
    content: string,
    pageUrl: string,
    pageTitle: string,
  ): Promise<ChunkResult[]> {
    await this.ensureInitialized();

    const metadataPrefix = `Source: ${pageTitle} (${pageUrl})\n\n`;
    const prefixTokens = this.encode(metadataPrefix).length;
    const effectiveMaxSize = this.chunkSizeMax - prefixTokens;

    // Split content into sentences
    const sentences = this.splitIntoSentences(content);
    const chunks: ChunkResult[] = [];

    let currentTokens: number[] = [];
    let currentSentences: string[] = [];
    let chunkIndex = 0;

    for (const sentence of sentences) {
      const sentenceTokens = this.encode(sentence);

      if (currentTokens.length + sentenceTokens.length > effectiveMaxSize && currentTokens.length >= this.chunkSizeMin - prefixTokens) {
        // Emit current chunk
        const chunkText = metadataPrefix + currentSentences.join(' ');
        chunks.push({
          text: chunkText,
          tokenCount: currentTokens.length + prefixTokens,
          chunkIndex,
          pageUrl,
          pageTitle,
        });
        chunkIndex++;

        // Apply overlap — keep last N tokens worth of sentences
        const overlapResult = this.applyOverlap(currentSentences, currentTokens);
        currentSentences = overlapResult.sentences;
        currentTokens = overlapResult.tokens;
      }

      currentSentences.push(sentence);
      currentTokens = this.encode(currentSentences.join(' '));
    }

    // Emit remaining content
    if (currentSentences.length > 0) {
      const chunkText = metadataPrefix + currentSentences.join(' ');
      chunks.push({
        text: chunkText,
        tokenCount: currentTokens.length + prefixTokens,
        chunkIndex,
        pageUrl,
        pageTitle,
      });
    }

    return chunks;
  }

  private splitIntoSentences(text: string): string[] {
    // Split on sentence boundaries while preserving the delimiter
    const raw = text.match(/[^.!?]+[.!?]+\s*|[^.!?]+$/g) || [text];
    return raw.map((s) => s.trim()).filter(Boolean);
  }

  private applyOverlap(
    sentences: string[],
    _tokens: number[],
  ): { sentences: string[]; tokens: number[] } {
    // Walk backwards through sentences until we accumulate ~overlapTokens
    let overlapTokenCount = 0;
    const overlapSentences: string[] = [];

    for (let i = sentences.length - 1; i >= 0; i--) {
      const sentenceTokens = this.encode(sentences[i]!);
      if (overlapTokenCount + sentenceTokens.length > this.chunkOverlap) break;
      overlapTokenCount += sentenceTokens.length;
      overlapSentences.unshift(sentences[i]!);
    }

    return {
      sentences: overlapSentences,
      tokens: this.encode(overlapSentences.join(' ')),
    };
  }
}
