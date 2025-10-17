/**
 * Voice Search Page
 * Voice-powered email search with recording, transcription, and spoken responses
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Loader2,
  AlertCircle,
  Mail,
  Volume2,
  RefreshCw,
  Sparkles,
  Play,
  Pause,
} from 'lucide-react';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { voiceService } from '../services/voiceService';
import type { VoiceSearchResponse } from '../services/voiceService';

const VoiceSearchPage: React.FC = () => {
  const {
    recordingState,
    audioBlob,
    duration,
    error: recorderError,
    isSupported,
    startRecording,
    stopRecording,
    resetRecording,
    requestPermission,
  } = useVoiceRecorder();

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResponse, setSearchResponse] = useState<VoiceSearchResponse | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const responseAudioRef = useRef<string | null>(null);

  // Request permission on mount
  useEffect(() => {
    if (isSupported) {
      requestPermission();
    }
  }, [isSupported, requestPermission]);

  // Format duration (seconds to MM:SS)
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle voice search
  const handleVoiceSearch = async () => {
    if (!audioBlob) {
      setError('No audio recording found');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSearchResponse(null);

    try {
      const response = await voiceService.voiceSearch(audioBlob, 'voice-query.webm');
      setSearchResponse(response);

      // Convert base64 audio to playable URL
      const responseAudioBlob = voiceService.base64ToBlob(response.audioResponse, 'audio/mpeg');
      const responseUrl = voiceService.createAudioUrl(responseAudioBlob);
      responseAudioRef.current = responseUrl;

      // Auto-play response
      if (audioPlayerRef.current) {
        audioPlayerRef.current.src = responseUrl;
        audioPlayerRef.current.play();
        setIsPlaying(true);
      }
    } catch (err: any) {
      console.error('Voice search failed:', err);
      setError(err.response?.data?.message || err.message || 'Voice search failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle record button click
  const handleRecordClick = async () => {
    if (recordingState === 'idle' || recordingState === 'stopped') {
      resetRecording();
      setSearchResponse(null);
      setError(null);
      await startRecording();
    } else if (recordingState === 'recording') {
      stopRecording();
    }
  };

  // Handle reset
  const handleReset = () => {
    resetRecording();
    setSearchResponse(null);
    setError(null);
    setIsPlaying(false);

    if (responseAudioRef.current) {
      voiceService.revokeAudioUrl(responseAudioRef.current);
      responseAudioRef.current = null;
    }
  };

  // Toggle audio playback
  const togglePlayback = () => {
    if (audioPlayerRef.current) {
      if (isPlaying) {
        audioPlayerRef.current.pause();
      } else {
        audioPlayerRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Handle audio player events
  useEffect(() => {
    const audio = audioPlayerRef.current;
    if (!audio) return;

    const handleEnded = () => setIsPlaying(false);
    const handlePause = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
    };
  }, []);

  // Browser not supported
  if (!isSupported) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Browser Not Supported</h2>
          <p className="text-slate-600">
            Your browser does not support voice recording. Please use Chrome, Firefox, or Safari.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-slate-900">Voice Search</h1>
          </div>
          <p className="text-slate-600">Ask Chief anything about your emails using your voice</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Recording Interface */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 mb-8">
          {/* Status Indicator */}
          <div className="text-center mb-8">
            {recordingState === 'idle' && (
              <div>
                <h2 className="text-2xl font-semibold text-slate-900 mb-2">Ready to Listen</h2>
                <p className="text-slate-600">Click the microphone to start recording your query</p>
              </div>
            )}

            {recordingState === 'recording' && (
              <div>
                <h2 className="text-2xl font-semibold text-red-600 mb-2 animate-pulse">Recording...</h2>
                <p className="text-slate-600">Speak your query clearly</p>
                <p className="text-2xl font-mono text-slate-900 mt-3">{formatDuration(duration)}</p>
              </div>
            )}

            {recordingState === 'stopped' && !searchResponse && (
              <div>
                <h2 className="text-2xl font-semibold text-green-600 mb-2">Recording Complete</h2>
                <p className="text-slate-600">Duration: {formatDuration(duration)}</p>
              </div>
            )}

            {isProcessing && (
              <div>
                <h2 className="text-2xl font-semibold text-blue-600 mb-2">Processing...</h2>
                <p className="text-slate-600">Analyzing your voice query</p>
              </div>
            )}

            {searchResponse && (
              <div>
                <h2 className="text-2xl font-semibold text-purple-600 mb-2">Results Ready</h2>
                <p className="text-slate-600">Found {searchResponse.searchResults.results.length} matching emails</p>
              </div>
            )}
          </div>

          {/* Microphone Button */}
          <div className="flex justify-center mb-6">
            <button
              onClick={handleRecordClick}
              disabled={isProcessing}
              className={`
                relative w-32 h-32 rounded-full flex items-center justify-center
                transition-all duration-300 transform hover:scale-105
                ${recordingState === 'recording'
                  ? 'bg-red-500 hover:bg-red-600 shadow-2xl shadow-red-500/50 animate-pulse'
                  : 'bg-gradient-to-br from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 shadow-xl'
                }
                ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {isProcessing ? (
                <Loader2 className="w-16 h-16 text-white animate-spin" />
              ) : recordingState === 'recording' ? (
                <MicOff className="w-16 h-16 text-white" />
              ) : (
                <Mic className="w-16 h-16 text-white" />
              )}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4">
            {recordingState === 'stopped' && audioBlob && !searchResponse && (
              <button
                onClick={handleVoiceSearch}
                disabled={isProcessing}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg
                         hover:from-purple-700 hover:to-blue-700 font-medium transition-all duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Search
                  </>
                )}
              </button>
            )}

            {(recordingState === 'stopped' || searchResponse) && (
              <button
                onClick={handleReset}
                disabled={isProcessing}
                className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300
                         font-medium transition-colors duration-200 flex items-center gap-2
                         disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className="w-5 h-5" />
                New Query
              </button>
            )}
          </div>

          {/* Error Message */}
          {(error || recorderError) && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-red-800 font-medium">Error</p>
                <p className="text-red-600 text-sm mt-1">{error || recorderError}</p>
              </div>
            </div>
          )}
        </div>

        {/* Search Response */}
        {searchResponse && (
          <div className="space-y-6">
            {/* Transcribed Query */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200 p-6">
              <h3 className="text-sm font-semibold text-purple-900 mb-2">YOUR QUERY</h3>
              <p className="text-lg text-slate-900 mb-3">"{searchResponse.query}"</p>

              {searchResponse.enhancedQuery && searchResponse.enhancedQuery !== searchResponse.query && (
                <div className="mt-3 pt-3 border-t border-purple-200">
                  <h4 className="text-xs font-semibold text-purple-700 mb-1">AI Enhanced Search</h4>
                  <p className="text-sm text-slate-600 italic">"{searchResponse.enhancedQuery}"</p>
                </div>
              )}
            </div>

            {/* Voice Response */}
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-purple-600" />
                  Chief's Response
                </h3>
                <button
                  onClick={togglePlayback}
                  className="p-2 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-600
                           transition-colors duration-200"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-slate-700 leading-relaxed">{searchResponse.responseText}</p>
              <audio ref={audioPlayerRef} className="hidden" />
            </div>

            {/* Search Results */}
            {searchResponse.searchResults.results.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-blue-600" />
                  Matching Emails ({searchResponse.searchResults.results.length})
                </h3>

                <div className="space-y-3">
                  {searchResponse.searchResults.results.map((result) => (
                    <div
                      key={result.id}
                      className="bg-white rounded-lg border border-slate-200 hover:border-purple-300
                               hover:shadow-md transition-all p-5"
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <h4 className="text-base font-semibold text-slate-900 mb-1">
                            {result.subject || '(No subject)'}
                          </h4>
                          <div className="flex items-center gap-3 text-sm text-slate-600">
                            <span className="font-medium">{result.from}</span>
                            <span className="text-slate-400">•</span>
                            <span>
                              {new Date(result.received_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium flex-shrink-0">
                          {(result.relevance_score * 100).toFixed(0)}%
                        </span>
                      </div>

                      {result.body_preview && (
                        <p className="text-sm text-slate-600 line-clamp-2">
                          {result.body_preview}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {searchResponse.searchResults.results.length === 0 && (
              <div className="bg-slate-50 rounded-lg border border-slate-200 p-8 text-center">
                <Mail className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600">No matching emails found</p>
              </div>
            )}
          </div>
        )}

        {/* Initial State */}
        {recordingState === 'idle' && !searchResponse && (
          <div className="text-center py-12">
            <Sparkles className="w-20 h-20 text-purple-200 mx-auto mb-6" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              Try asking Chief about your emails
            </h3>
            <p className="text-slate-600 mb-6">Examples of what you can ask:</p>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                'Show me emails about meetings',
                'Find messages from Sarah',
                'What did John say about the project?',
                'Any emails about deadlines?',
              ].map((example) => (
                <div
                  key={example}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700"
                >
                  "{example}"
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceSearchPage;
