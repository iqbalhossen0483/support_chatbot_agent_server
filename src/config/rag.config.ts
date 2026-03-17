import { registerAs } from '@nestjs/config';

export default registerAs('rag', () => ({
  chunkSizeMin: parseInt(process.env.CHUNK_SIZE_MIN || '500', 10),
  chunkSizeMax: parseInt(process.env.CHUNK_SIZE_MAX || '600', 10),
  chunkOverlap: parseInt(process.env.CHUNK_OVERLAP || '50', 10),
  vectorSearchTopK: parseInt(process.env.VECTOR_SEARCH_TOP_K || '7', 10),
  vectorSimilarityThreshold: parseFloat(
    process.env.VECTOR_SIMILARITY_THRESHOLD || '0.3',
  ),
  confidenceThreshold: parseFloat(process.env.CONFIDENCE_THRESHOLD || '0.45'),
  // Comma-separated URLs for Gemini to fetch live data from when needed (e.g., pricing pages)
  contextUrls: process.env.RAG_CONTEXT_URLS
    ? process.env.RAG_CONTEXT_URLS.split(',')
        .map((u) => u.trim())
        .filter(Boolean)
    : [],
}));
