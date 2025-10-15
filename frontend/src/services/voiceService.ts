/**
 * Voice Service
 * Handles voice API calls for speech-to-text, text-to-speech, and voice search
 */

import { api } from './api';
import type { SearchResult } from './searchService';

export interface TranscriptionResponse {
  success: boolean;
  transcription: string;
  language?: string;
  metadata: {
    filename: string;
    fileSize: number;
    duration?: number;
  };
}

export interface VoiceSearchResponse {
  success: boolean;
  query: string;
  enhancedQuery?: string; // AI-enhanced search query
  responseText: string;
  searchResults: {
    results: SearchResult[];
  };
  audioResponse: string; // Base64 encoded audio
  metadata: {
    filename: string;
    fileSize: number;
    audioFormat: string;
  };
}

export interface VoiceHealthResponse {
  status: 'healthy' | 'unhealthy';
  whisperAvailable: boolean;
  ttsAvailable: boolean;
  apiKeyConfigured: boolean;
  endpoints: {
    transcribe: string;
    speak: string;
    search: string;
  };
}

class VoiceService {
  /**
   * Convert speech to text (upload audio file)
   */
  async transcribe(audioBlob: Blob, filename: string = 'recording.webm'): Promise<TranscriptionResponse> {
    const formData = new FormData();
    formData.append('audio', audioBlob, filename);

    const response = await api.post<TranscriptionResponse>('/voice/transcribe', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  /**
   * Convert text to speech (returns audio blob)
   */
  async speak(
    text: string,
    options?: {
      voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
      speed?: number;
      model?: 'tts-1' | 'tts-1-hd';
      format?: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav';
    }
  ): Promise<Blob> {
    const response = await api.post(
      '/voice/speak',
      {
        text,
        voice: options?.voice || 'nova',
        speed: options?.speed || 1.0,
        model: options?.model || 'tts-1',
        format: options?.format || 'mp3',
      },
      {
        responseType: 'blob', // Important: Get binary data
      }
    );

    return response.data;
  }

  /**
   * Voice-powered search (full pipeline: speech → search → speech)
   */
  async voiceSearch(audioBlob: Blob, filename: string = 'query.webm'): Promise<VoiceSearchResponse> {
    const formData = new FormData();
    formData.append('audio', audioBlob, filename);

    const response = await api.post<VoiceSearchResponse>('/voice/search', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  /**
   * Check voice service health
   */
  async getHealth(): Promise<VoiceHealthResponse> {
    const response = await api.get<VoiceHealthResponse>('/voice/health');
    return response.data;
  }

  /**
   * Helper: Convert base64 audio to Blob for playback
   */
  base64ToBlob(base64: string, mimeType: string = 'audio/mpeg'): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  /**
   * Helper: Create audio URL from blob (for <audio> element)
   */
  createAudioUrl(blob: Blob): string {
    return URL.createObjectURL(blob);
  }

  /**
   * Helper: Cleanup audio URL to prevent memory leaks
   */
  revokeAudioUrl(url: string): void {
    URL.revokeObjectURL(url);
  }
}

export const voiceService = new VoiceService();
export default voiceService;
