import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChunkWithScore } from './vector-search.service.js';

export interface ConfidenceResult {
  confident: boolean;
  confidenceScore: number;
  reason: string;
}

const SENSITIVE_PATTERNS = [
  /\b(refund|complaint|legal|lawsuit|attorney|lawyer)\b/i,
  /\b(account.*(specific|issue|problem|hack|stolen))\b/i,
  /\b(speak|talk|connect).*(human|agent|person|someone)\b/i,
  /\b(safety|emergency|danger)\b/i,
];

@Injectable()
export class ConfidenceService {
  private readonly confidenceThreshold: number;

  constructor(config: ConfigService) {
    this.confidenceThreshold =
      config.get<number>('rag.confidenceThreshold') || 0.45;
  }

  evaluate(
    query: string,
    retrievedChunks: ChunkWithScore[],
    aiResponse: string,
  ): ConfidenceResult {
    // 1. Check if AI triggered escalation itself
    if (aiResponse.includes('[ESCALATE]')) {
      return {
        confident: false,
        confidenceScore: 0.2,
        reason: 'AI self-assessed low confidence',
      };
    }

    // 2. Check retrieval quality
    const bestScore =
      retrievedChunks.length > 0
        ? Math.max(...retrievedChunks.map((c) => c.similarityScore))
        : 0;

    if (bestScore < this.confidenceThreshold) {
      return {
        confident: false,
        confidenceScore: bestScore,
        reason: `Low retrieval relevance (best score: ${bestScore.toFixed(3)})`,
      };
    }

    // 3. Check for sensitive topics
    for (const pattern of SENSITIVE_PATTERNS) {
      if (pattern.test(query)) {
        return {
          confident: false,
          confidenceScore: bestScore,
          reason: `Sensitive topic detected in query`,
        };
      }
    }

    // 4. Check for explicit human request
    if (
      /\b(speak|talk|connect|transfer).*(human|agent|person|someone|representative)\b/i.test(
        query,
      )
    ) {
      return {
        confident: false,
        confidenceScore: bestScore,
        reason: 'User explicitly requested human agent',
      };
    }

    // Confident
    const avgScore =
      retrievedChunks.reduce((sum, c) => sum + c.similarityScore, 0) /
      retrievedChunks.length;
    return {
      confident: true,
      confidenceScore: avgScore,
      reason: 'Sufficient context retrieved',
    };
  }
}
