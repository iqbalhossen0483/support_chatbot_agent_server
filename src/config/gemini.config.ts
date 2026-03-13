import { registerAs } from '@nestjs/config';

export default registerAs('gemini', () => ({
  apiKey: process.env.GEMINI_API_KEY || '',
  model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  embeddingModel: process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004',
  embeddingDimensions: 768,
  embeddingBatchSize: 100,
}));
