/**
 * Search Page
 * Simple, clean UI for semantic email search
 */

import React, { useState, useEffect } from 'react';
import { Search, Loader2, AlertCircle, Mail, Clock, Sparkles } from 'lucide-react';
import { searchService } from '../services/searchService';
import type { SearchResult, SearchStats } from '../services/searchService';

const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [stats, setStats] = useState<SearchStats | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTime, setSearchTime] = useState<number | null>(null);
  const [threshold, setThreshold] = useState(0.4);

  // Load stats on mount
  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await searchService.getSearchStats();
      setStats(data);
    } catch (err: any) {
      console.error('Failed to load stats:', err);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim()) {
      setError('Please enter a search query');
      return;
    }

    setIsSearching(true);
    setError(null);
    setResults([]);

    try {
      const response = await searchService.searchEmails({
        q: query.trim(),
        threshold,
        limit: 20
      });

      setResults(response.results);
      setSearchTime(response.metadata.query_time_ms);

      if (response.results.length === 0) {
        setError(`No results found above threshold ${threshold}. Try lowering the threshold or use different keywords.`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Search failed');
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getMatchTypeBadge = (type: string) => {
    const colors = {
      hybrid: 'bg-purple-100 text-purple-700',
      semantic: 'bg-blue-100 text-blue-700',
      keyword: 'bg-green-100 text-green-700'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-slate-900">Email Search</h1>
          </div>
          <p className="text-slate-600">Search your emails using natural language</p>

          {/* Stats Bar */}
          {stats && (
            <div className="mt-4 flex items-center gap-6 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span>{stats.totalEmails} emails indexed</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>{stats.embeddingCoverage} coverage</span>
              </div>
              {stats.ready ? (
                <span className="text-green-600 font-medium">✓ Ready</span>
              ) : (
                <span className="text-yellow-600 font-medium">⚠ Not ready</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder='Try: "software engineer jobs" or "AI stocks" or "LinkedIn messages"'
                  className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSearching}
                />
              </div>
              <button
                type="submit"
                disabled={isSearching || !query.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition-colors"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Search
                  </>
                )}
              </button>
            </div>

            {/* Threshold Control */}
            <div className="mt-4 flex items-center gap-4">
              <label className="text-sm text-slate-600 font-medium">
                Relevance Threshold: {threshold.toFixed(1)}
              </label>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.1"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="flex-1 max-w-xs"
              />
              <span className="text-xs text-slate-500">
                {threshold >= 0.7 ? 'High precision' : threshold >= 0.4 ? 'Balanced' : 'Broad search'}
              </span>
            </div>
          </div>
        </form>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-red-800 font-medium">Search Error</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div>
            {/* Results Header */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Found {results.length} results
                {searchTime && (
                  <span className="ml-2 text-sm font-normal text-slate-500">
                    in {searchTime}ms
                  </span>
                )}
              </h2>
            </div>

            {/* Results List */}
            <div className="space-y-3">
              {results.map((result) => (
                <div
                  key={result.id}
                  className="bg-white rounded-lg border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all p-5"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-slate-900 mb-1">
                        {result.subject || '(No subject)'}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <span className="font-medium">{result.from}</span>
                        <span className="text-slate-400">•</span>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDate(result.received_at)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getMatchTypeBadge(result.match_type)}`}>
                        {result.match_type}
                      </span>
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
                        {(result.relevance_score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  {/* Body Preview */}
                  {result.body_preview && (
                    <p className="text-sm text-slate-600 line-clamp-2 mb-2">
                      {result.body_preview}
                    </p>
                  )}

                  {/* Match Explanation */}
                  <p className="text-xs text-slate-500 italic">
                    {result.match_explanation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isSearching && !error && results.length === 0 && query && (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 text-lg">No results found</p>
            <p className="text-slate-500 text-sm mt-2">Try a different query or lower the threshold</p>
          </div>
        )}

        {/* Initial State */}
        {!query && results.length === 0 && (
          <div className="text-center py-16">
            <Sparkles className="w-20 h-20 text-blue-200 mx-auto mb-6" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              Search your emails with natural language
            </h3>
            <p className="text-slate-600 mb-6">
              Try queries like "job opportunities", "important updates", or "meeting invites"
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {['software engineer jobs', 'AI stocks', 'LinkedIn messages'].map((example) => (
                <button
                  key={example}
                  onClick={() => setQuery(example)}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:border-blue-300 hover:text-blue-600 transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
