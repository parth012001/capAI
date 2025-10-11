/**
 * Embedding Service
 * Generates vector embeddings using OpenAI's text-embedding-3-small model
 * These embeddings enable semantic search across emails
 */

import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

export class EmbeddingService {
  private openai: OpenAI;
  private model = 'text-embedding-3-small'; // 1536 dimensions, cost-effective
  private maxBatchSize = 100; // OpenAI allows up to 2048, but we'll be conservative

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Prepare email text for embedding
   * Combines subject and body into a searchable text chunk
   */
  prepareEmailText(subject: string | null, body: string | null, from?: string | null): string {
    const parts: string[] = [];

    if (from) {
      parts.push(`From: ${from}`);
    }

    if (subject) {
      parts.push(`Subject: ${subject}`);
    }

    if (body) {
      // Limit body to first 8000 characters to avoid token limits
      // OpenAI's text-embedding-3-small has max of 8191 tokens (~32k characters)
      const truncatedBody = body.substring(0, 8000);
      parts.push(`Body: ${truncatedBody}`);
    }

    return parts.join('\n\n');
  }

  /**
   * Generate embedding for a single text
   * Returns a 1536-dimensional vector
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      if (!text || text.trim().length === 0) {
        throw new Error('Cannot generate embedding for empty text');
      }

      const response = await this.openai.embeddings.create({
        model: this.model,
        input: text,
        encoding_format: 'float', // Standard floating point format
      });

      const embedding = response.data[0].embedding;

      if (!embedding || embedding.length !== 1536) {
        throw new Error(`Invalid embedding dimensions: ${embedding?.length || 0}`);
      }

      return embedding;
    } catch (error: any) {
      console.error('❌ Error generating embedding:', error.message);
      throw error;
    }
  }

  /**
   * Generate embedding specifically for an email
   * Handles the text preparation automatically
   */
  async generateEmailEmbedding(
    subject: string | null,
    body: string | null,
    from?: string | null
  ): Promise<number[]> {
    const text = this.prepareEmailText(subject, body, from);
    return this.generateEmbedding(text);
  }

  /**
   * Generate embeddings for multiple texts in batches
   * More efficient for bulk operations
   */
  async generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    try {
      if (texts.length === 0) {
        return [];
      }

      // Filter out empty texts
      const validTexts = texts.filter(t => t && t.trim().length > 0);

      if (validTexts.length === 0) {
        throw new Error('No valid texts to embed');
      }

      // Process in batches if needed
      const allEmbeddings: number[][] = [];

      for (let i = 0; i < validTexts.length; i += this.maxBatchSize) {
        const batch = validTexts.slice(i, i + this.maxBatchSize);

        console.log(`📊 Generating embeddings for batch ${Math.floor(i / this.maxBatchSize) + 1} (${batch.length} texts)`);

        const response = await this.openai.embeddings.create({
          model: this.model,
          input: batch,
          encoding_format: 'float',
        });

        const batchEmbeddings = response.data.map(item => item.embedding);
        allEmbeddings.push(...batchEmbeddings);

        // Rate limiting: wait a bit between batches
        if (i + this.maxBatchSize < validTexts.length) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
        }
      }

      return allEmbeddings;
    } catch (error: any) {
      console.error('❌ Error generating batch embeddings:', error.message);
      throw error;
    }
  }

  /**
   * Format embedding for PostgreSQL vector type
   * Converts array to PostgreSQL vector format: '[0.1, 0.2, 0.3, ...]'
   */
  formatEmbeddingForDB(embedding: number[]): string {
    return `[${embedding.join(',')}]`;
  }

  /**
   * Calculate embedding cost estimate
   * text-embedding-3-small costs $0.00002 / 1K tokens
   */
  estimateCost(textCount: number, avgTokensPerText: number = 500): number {
    const totalTokens = textCount * avgTokensPerText;
    const cost = (totalTokens / 1000) * 0.00002;
    return parseFloat(cost.toFixed(6));
  }

  /**
   * Get embedding model info
   */
  getModelInfo() {
    return {
      model: this.model,
      dimensions: 1536,
      maxTokens: 8191,
      costPer1kTokens: 0.00002,
      maxBatchSize: this.maxBatchSize,
    };
  }
}

// Export singleton instance
export const embeddingService = new EmbeddingService();
