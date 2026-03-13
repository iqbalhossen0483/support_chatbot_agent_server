import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../../rag/services/llm.service.js';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);

  constructor(private readonly llm: LlmService) {}

  async generateEmbedding(text: string): Promise<number[]> {
    return this.llm.generateEmbedding(text);
  }

  async generateBatchEmbeddings(
    texts: string[],
    batchSize = 100,
  ): Promise<number[][]> {
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      this.logger.log(
        `Generating embeddings for batch ${i / batchSize + 1} (${batch.length} texts)`,
      );

      let retries = 0;
      const maxRetries = 3;

      while (retries < maxRetries) {
        try {
          const embeddings = await this.llm.generateBatchEmbeddings(batch);
          allEmbeddings.push(...embeddings);
          break;
        } catch (error) {
          retries++;
          if (retries >= maxRetries) throw error;
          const delay = Math.pow(2, retries) * 1000;
          this.logger.warn(
            `Embedding retry ${retries}/${maxRetries}, waiting ${delay}ms`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    return allEmbeddings;
  }
}
