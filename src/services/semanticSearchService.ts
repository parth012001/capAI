/**
 * Semantic Search Service
 * Implements hybrid search (keyword + vector similarity) for emails
 * Uses 70% semantic + 30% keyword weighting for natural language queries
 */

import { pool } from '../database/connection';
import { embeddingService } from './embeddingService';

interface SearchResult {
  id: number;
  gmail_id: string;
  subject: string;
  from_email: string;
  to_email: string;
  body: string;
  received_at: Date;
  relevance_score: number;
  match_type: 'semantic' | 'keyword' | 'hybrid';
  keyword_score?: number;
  semantic_score?: number;
}

interface SearchOptions {
  userId: string;
  limit?: number;
  threshold?: number; // Minimum relevance score (default: 0.8)
  includePromotional?: boolean;
}

export class SemanticSearchService {
  private readonly SEMANTIC_WEIGHT = 0.7; // 70% weight to semantic similarity
  private readonly KEYWORD_WEIGHT = 0.3;  // 30% weight to keyword matching
  private readonly DEFAULT_THRESHOLD = 0.8;
  private readonly DEFAULT_LIMIT = 20;

  /**
   * Main search function - implements hybrid search
   */
  async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
    const {
      userId,
      limit = this.DEFAULT_LIMIT,
      threshold = this.DEFAULT_THRESHOLD,
      includePromotional = false
    } = options;

    console.log(`🔍 Searching for: "${query}" (user: ${userId})`);

    try {
      // Step 1: Generate embedding for the search query
      const queryEmbedding = await embeddingService.generateEmbedding(query);
      const embeddingStr = embeddingService.formatEmbeddingForDB(queryEmbedding);

      // Step 2: Run hybrid search query
      const searchQuery = `
        WITH semantic_results AS (
          -- Semantic search using vector similarity
          SELECT
            id,
            gmail_id,
            subject,
            from_email,
            to_email,
            body,
            received_at,
            (1 - (embedding <=> $1::vector)) as similarity_score
          FROM emails
          WHERE user_id = $2
            AND embedding IS NOT NULL
          ORDER BY embedding <=> $1::vector
          LIMIT 50
        ),
        keyword_results AS (
          -- Keyword search using PostgreSQL full-text search
          SELECT
            id,
            gmail_id,
            subject,
            from_email,
            to_email,
            body,
            received_at,
            ts_rank(
              to_tsvector('english',
                COALESCE(subject, '') || ' ' ||
                COALESCE(from_email, '') || ' ' ||
                COALESCE(body, '')
              ),
              plainto_tsquery('english', $3)
            ) as keyword_rank
          FROM emails
          WHERE user_id = $2
            AND (
              to_tsvector('english',
                COALESCE(subject, '') || ' ' ||
                COALESCE(from_email, '') || ' ' ||
                COALESCE(body, '')
              ) @@ plainto_tsquery('english', $3)
            )
          LIMIT 50
        )
        -- Combine and rank results
        SELECT DISTINCT
          COALESCE(s.id, k.id) as id,
          COALESCE(s.gmail_id, k.gmail_id) as gmail_id,
          COALESCE(s.subject, k.subject) as subject,
          COALESCE(s.from_email, k.from_email) as from_email,
          COALESCE(s.to_email, k.to_email) as to_email,
          COALESCE(s.body, k.body) as body,
          COALESCE(s.received_at, k.received_at) as received_at,
          COALESCE(s.similarity_score, 0) as semantic_score,
          COALESCE(k.keyword_rank, 0) as keyword_score,
          -- Hybrid score: 70% semantic + 30% keyword
          (COALESCE(s.similarity_score, 0) * $4 + COALESCE(k.keyword_rank, 0) * $5) as relevance_score,
          CASE
            WHEN s.id IS NOT NULL AND k.id IS NOT NULL THEN 'hybrid'
            WHEN s.id IS NOT NULL THEN 'semantic'
            ELSE 'keyword'
          END as match_type
        FROM semantic_results s
        FULL OUTER JOIN keyword_results k ON s.id = k.id
        WHERE (COALESCE(s.similarity_score, 0) * $4 + COALESCE(k.keyword_rank, 0) * $5) >= $6
        ORDER BY relevance_score DESC
        LIMIT $7
      `;

      const result = await pool.query(searchQuery, [
        embeddingStr,
        userId,
        query,
        this.SEMANTIC_WEIGHT,
        this.KEYWORD_WEIGHT,
        threshold,
        limit
      ]);

      console.log(`✅ Found ${result.rows.length} results above threshold ${threshold}`);

      return result.rows.map(row => ({
        id: row.id,
        gmail_id: row.gmail_id,
        subject: row.subject,
        from_email: row.from_email,
        to_email: row.to_email,
        body: row.body?.substring(0, 500), // Truncate body for response
        received_at: row.received_at,
        relevance_score: parseFloat(row.relevance_score.toFixed(3)),
        match_type: row.match_type,
        semantic_score: row.semantic_score ? parseFloat(row.semantic_score.toFixed(3)) : undefined,
        keyword_score: row.keyword_score ? parseFloat(row.keyword_score.toFixed(3)) : undefined,
      }));

    } catch (error: any) {
      console.error('❌ Semantic search failed:', error.message);
      throw error;
    }
  }

  /**
   * Semantic-only search (no keyword matching)
   * Useful for purely conceptual queries
   */
  async semanticSearch(query: string, options: SearchOptions): Promise<SearchResult[]> {
    const {
      userId,
      limit = this.DEFAULT_LIMIT,
      threshold = this.DEFAULT_THRESHOLD
    } = options;

    console.log(`🔍 Semantic-only search: "${query}"`);

    try {
      const queryEmbedding = await embeddingService.generateEmbedding(query);
      const embeddingStr = embeddingService.formatEmbeddingForDB(queryEmbedding);

      const searchQuery = `
        SELECT
          id,
          gmail_id,
          subject,
          from_email,
          to_email,
          body,
          received_at,
          (1 - (embedding <=> $1::vector)) as relevance_score
        FROM emails
        WHERE user_id = $2
          AND embedding IS NOT NULL
          AND (1 - (embedding <=> $1::vector)) >= $3
        ORDER BY embedding <=> $1::vector
        LIMIT $4
      `;

      const result = await pool.query(searchQuery, [
        embeddingStr,
        userId,
        threshold,
        limit
      ]);

      console.log(`✅ Found ${result.rows.length} semantic results`);

      return result.rows.map(row => ({
        id: row.id,
        gmail_id: row.gmail_id,
        subject: row.subject,
        from_email: row.from_email,
        to_email: row.to_email,
        body: row.body?.substring(0, 500),
        received_at: row.received_at,
        relevance_score: parseFloat(row.relevance_score.toFixed(3)),
        match_type: 'semantic',
        semantic_score: parseFloat(row.relevance_score.toFixed(3)),
      }));

    } catch (error: any) {
      console.error('❌ Semantic search failed:', error.message);
      throw error;
    }
  }

  /**
   * Get search statistics for debugging
   */
  async getSearchStats(userId: string): Promise<{
    totalEmails: number;
    emailsWithEmbeddings: number;
    emailsWithoutEmbeddings: number;
    embeddingCoverage: string;
  }> {
    const stats = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(embedding) as with_embeddings,
        COUNT(*) - COUNT(embedding) as without_embeddings
      FROM emails
      WHERE user_id = $1
    `, [userId]);

    const total = parseInt(stats.rows[0].total);
    const withEmbeddings = parseInt(stats.rows[0].with_embeddings);
    const withoutEmbeddings = parseInt(stats.rows[0].without_embeddings);

    return {
      totalEmails: total,
      emailsWithEmbeddings: withEmbeddings,
      emailsWithoutEmbeddings: withoutEmbeddings,
      embeddingCoverage: total > 0 ? `${((withEmbeddings / total) * 100).toFixed(1)}%` : '0%'
    };
  }

  /**
   * Explain why a result matched (for debugging)
   */
  explainMatch(result: SearchResult): string {
    const parts: string[] = [];

    if (result.match_type === 'hybrid') {
      parts.push(`Hybrid match (semantic: ${result.semantic_score}, keyword: ${result.keyword_score})`);
    } else if (result.match_type === 'semantic') {
      parts.push(`Semantic match (${result.semantic_score})`);
    } else {
      parts.push(`Keyword match (${result.keyword_score})`);
    }

    parts.push(`Final score: ${result.relevance_score}`);

    return parts.join(' • ');
  }
}

// Export singleton instance
export const semanticSearchService = new SemanticSearchService();
