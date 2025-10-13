/**
 * Search Service
 * Handles semantic search API calls with proper authentication
 */

import { api } from './api';

export interface SearchResult {
  id: number;
  gmail_id: string;
  subject: string;
  from: string;
  to: string;
  body_preview: string;
  received_at: string;
  relevance_score: number;
  match_type: 'semantic' | 'keyword' | 'hybrid';
  match_explanation: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  metadata: {
    total_results: number;
    query_time_ms: number;
    threshold_used: number;
    search_mode: string;
    totalEmails: number;
    emailsWithEmbeddings: number;
    emailsWithoutEmbeddings: number;
    embeddingCoverage: string;
  };
}

export interface SearchStats {
  totalEmails: number;
  emailsWithEmbeddings: number;
  emailsWithoutEmbeddings: number;
  embeddingCoverage: string;
  ready: boolean;
  message: string;
}

export interface SearchParams {
  q: string;
  limit?: number;
  threshold?: number;
  mode?: 'hybrid' | 'semantic';
}

class SearchService {
  /**
   * Search emails using semantic search
   */
  async searchEmails(params: SearchParams): Promise<SearchResponse> {
    const { q, limit = 20, threshold = 0.4, mode = 'hybrid' } = params;

    const response = await api.get<SearchResponse>('/emails/search', {
      params: {
        q,
        limit,
        threshold,
        mode
      }
    });

    return response.data;
  }

  /**
   * Get search statistics (embedding coverage, readiness)
   */
  async getSearchStats(): Promise<SearchStats> {
    const response = await api.get<SearchStats>('/emails/search/stats');
    return response.data;
  }
}

export const searchService = new SearchService();
export default searchService;
