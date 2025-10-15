/**
 * Voice Service
 * Handles voice-to-text and text-to-voice conversions using OpenAI APIs
 * - Speech-to-Text: Whisper API for transcription
 * - Text-to-Speech: OpenAI TTS API for voice generation
 */

import OpenAI from 'openai';
import dotenv from 'dotenv';
import { Readable } from 'stream';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

dotenv.config();

// Type definitions for better type safety
export interface TranscriptionOptions {
  language?: string; // ISO 639-1 language code (e.g., 'en', 'es', 'fr')
  prompt?: string; // Optional text to guide transcription style
  temperature?: number; // 0-1, higher = more creative (default: 0)
  response_format?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
}

export interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
  confidence?: number;
}

export interface TTSOptions {
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  speed?: number; // 0.25 - 4.0, default: 1.0
  model?: 'tts-1' | 'tts-1-hd'; // tts-1 = fast, tts-1-hd = high quality
  response_format?: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm';
}

export class VoiceService {
  private openai: OpenAI;

  // Configuration defaults
  private readonly DEFAULT_WHISPER_MODEL = 'whisper-1';
  private readonly DEFAULT_TTS_MODEL = 'tts-1'; // Fast, low-latency
  private readonly DEFAULT_VOICE = 'nova'; // Clear, professional voice
  private readonly DEFAULT_SPEED = 1.0;

  // Supported audio formats for Whisper
  private readonly SUPPORTED_AUDIO_FORMATS = [
    'mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm'
  ];

  // Max audio file size (25 MB for Whisper)
  private readonly MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25 MB in bytes

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    if (!process.env.OPENAI_API_KEY) {
      console.warn('⚠️  [VOICE SERVICE] OPENAI_API_KEY not set. Voice features will not work.');
    }
  }

  /**
   * Validate audio file before processing
   */
  private validateAudioFile(file: Buffer, filename: string): void {
    // Check file size
    const fileSize = file.length;
    if (fileSize > this.MAX_AUDIO_SIZE) {
      throw new Error(`Audio file too large. Max size: ${this.MAX_AUDIO_SIZE / 1024 / 1024}MB, got: ${(fileSize / 1024 / 1024).toFixed(2)}MB`);
    }

    if (fileSize === 0) {
      throw new Error('Audio file is empty');
    }

    // Check file extension
    const extension = filename.split('.').pop()?.toLowerCase();
    if (!extension || !this.SUPPORTED_AUDIO_FORMATS.includes(extension)) {
      throw new Error(
        `Unsupported audio format: ${extension}. Supported formats: ${this.SUPPORTED_AUDIO_FORMATS.join(', ')}`
      );
    }
  }

  /**
   * Convert speech to text using OpenAI Whisper
   * Supports multiple audio formats: mp3, mp4, mpeg, mpga, m4a, wav, webm
   *
   * @param audioBuffer - Audio file as Buffer
   * @param filename - Original filename (for format detection)
   * @param options - Transcription options
   * @returns Transcribed text
   */
  async speechToText(
    audioBuffer: Buffer,
    filename: string,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    try {
      console.log(`🎤 [VOICE SERVICE] Starting speech-to-text transcription for: ${filename}`);

      // Validate audio file
      this.validateAudioFile(audioBuffer, filename);

      // Convert Buffer to File-like object for OpenAI API
      const audioFile = new File([audioBuffer], filename, {
        type: this.getAudioMimeType(filename)
      });

      const startTime = Date.now();

      // Call Whisper API
      const transcription = await this.openai.audio.transcriptions.create({
        file: audioFile,
        model: this.DEFAULT_WHISPER_MODEL,
        language: options.language,
        prompt: options.prompt,
        temperature: options.temperature ?? 0,
        response_format: options.response_format ?? 'verbose_json', // Get more details
      });

      const duration = Date.now() - startTime;

      // Parse response based on format
      let result: TranscriptionResult;

      if (options.response_format === 'text') {
        result = {
          text: transcription as unknown as string,
          duration,
        };
      } else {
        // verbose_json or json format
        const verboseResponse = transcription as any;
        result = {
          text: verboseResponse.text || transcription.toString(),
          language: verboseResponse.language,
          duration,
        };
      }

      console.log(`✅ [VOICE SERVICE] Transcription complete in ${duration}ms`);
      console.log(`📝 [VOICE SERVICE] Transcribed text: "${result.text.substring(0, 100)}${result.text.length > 100 ? '...' : ''}"`);

      return result;

    } catch (error: any) {
      console.error('❌ [VOICE SERVICE] Speech-to-text error:', {
        message: error.message,
        filename,
        error: error.response?.data || error
      });

      // Enhance error message for common issues
      if (error.message?.includes('file')) {
        throw new Error(`Audio file error: ${error.message}`);
      } else if (error.message?.includes('rate limit')) {
        throw new Error('OpenAI rate limit reached. Please try again in a moment.');
      } else if (error.message?.includes('API key')) {
        throw new Error('OpenAI API key not configured properly');
      }

      throw new Error(`Speech-to-text failed: ${error.message}`);
    }
  }

  /**
   * Convert text to speech using OpenAI TTS
   * Returns audio as Buffer (suitable for streaming or saving)
   *
   * @param text - Text to convert to speech
   * @param options - TTS options (voice, speed, model, format)
   * @returns Audio data as Buffer
   */
  async textToSpeech(
    text: string,
    options: TTSOptions = {}
  ): Promise<Buffer> {
    try {
      console.log(`🔊 [VOICE SERVICE] Starting text-to-speech conversion`);
      console.log(`📝 [VOICE SERVICE] Input text: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);

      // Validate input
      if (!text || text.trim().length === 0) {
        throw new Error('Text cannot be empty');
      }

      // OpenAI TTS has a limit of 4096 characters
      const MAX_TTS_LENGTH = 4096;
      if (text.length > MAX_TTS_LENGTH) {
        console.warn(`⚠️  [VOICE SERVICE] Text too long (${text.length} chars), truncating to ${MAX_TTS_LENGTH} chars`);
        text = text.substring(0, MAX_TTS_LENGTH);
      }

      const voice = options.voice ?? this.DEFAULT_VOICE;
      const speed = options.speed ?? this.DEFAULT_SPEED;
      const model = options.model ?? this.DEFAULT_TTS_MODEL;
      const response_format = options.response_format ?? 'mp3';

      console.log(`🎙️  [VOICE SERVICE] TTS Config: voice=${voice}, speed=${speed}, model=${model}, format=${response_format}`);

      const startTime = Date.now();

      // Call OpenAI TTS API
      const mp3Response = await this.openai.audio.speech.create({
        model: model,
        voice: voice,
        input: text,
        speed: speed,
        response_format: response_format,
      });

      // Convert response to Buffer
      const buffer = Buffer.from(await mp3Response.arrayBuffer());

      const duration = Date.now() - startTime;
      const sizeKB = (buffer.length / 1024).toFixed(2);

      console.log(`✅ [VOICE SERVICE] Text-to-speech complete in ${duration}ms`);
      console.log(`📦 [VOICE SERVICE] Audio size: ${sizeKB} KB`);

      return buffer;

    } catch (error: any) {
      console.error('❌ [VOICE SERVICE] Text-to-speech error:', {
        message: error.message,
        textLength: text?.length,
        error: error.response?.data || error
      });

      // Enhance error message
      if (error.message?.includes('rate limit')) {
        throw new Error('OpenAI rate limit reached. Please try again in a moment.');
      } else if (error.message?.includes('API key')) {
        throw new Error('OpenAI API key not configured properly');
      }

      throw new Error(`Text-to-speech failed: ${error.message}`);
    }
  }

  /**
   * Enhance natural language query for better search results
   * Converts conversational speech into optimized search keywords
   */
  async enhanceQueryForSearch(naturalQuery: string): Promise<string> {
    try {
      console.log(`🧠 [VOICE SERVICE] Enhancing query: "${naturalQuery}"`);

      const prompt = `Convert this natural language voice query into optimized search keywords for email search.

User's voice query: "${naturalQuery}"

Extract and return ONLY the key search terms, removing:
- Conversational words (hey, can you, please, etc.)
- Question words (what, where, when, etc.)
- Filler words (um, uh, like, etc.)

Focus on:
- Core topic/subject
- Key nouns and names
- Important dates or times
- Action words (meeting, deadline, update, etc.)

Return 3-7 keywords separated by spaces.

Example:
Input: "Hey, can you find me emails that are asking for meetings on Thursdays?"
Output: meeting requests Thursday scheduling

Input: "Show me messages from John about the project deadline"
Output: John project deadline

Now convert: "${naturalQuery}"
Output:`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 50,
        temperature: 0.1, // Low temperature for consistent extraction
      });

      const enhancedQuery = response.choices[0]?.message?.content?.trim() || naturalQuery;

      console.log(`✨ [VOICE SERVICE] Enhanced query: "${enhancedQuery}"`);

      return enhancedQuery;

    } catch (error: any) {
      console.error('⚠️  [VOICE SERVICE] Query enhancement failed, using original:', error.message);
      // Fallback to original query if enhancement fails
      return naturalQuery;
    }
  }

  /**
   * Voice query flow: Speech → Text → Query Enhancement → Semantic Search → Summary → Speech
   * This is a convenience method that combines multiple steps
   *
   * @param audioBuffer - User's voice query
   * @param filename - Audio filename
   * @param searchHandler - Async function to handle search (injected)
   * @returns Object with transcribed query, search results, and response audio
   */
  async processVoiceQuery(
    audioBuffer: Buffer,
    filename: string,
    searchHandler: (query: string) => Promise<any>
  ): Promise<{
    transcribedQuery: string;
    enhancedQuery: string;
    searchResults: any;
    responseText: string;
    responseAudio: Buffer;
  }> {
    try {
      console.log(`🎯 [VOICE SERVICE] Processing complete voice query pipeline`);

      // Step 1: Speech to Text
      const transcription = await this.speechToText(audioBuffer, filename);
      const query = transcription.text;

      console.log(`📝 [VOICE SERVICE] Voice query: "${query}"`);

      // Step 2: Enhance query for better search results (NEW!)
      const enhancedQuery = await this.enhanceQueryForSearch(query);

      // Step 3: Execute search with enhanced query
      const searchResults = await searchHandler(enhancedQuery);

      // Step 4: Generate spoken response (use original query for natural response)
      const responseText = this.generateSearchResponseText(searchResults, query);

      // Step 5: Convert response to speech
      const responseAudio = await this.textToSpeech(responseText, {
        voice: 'nova', // Professional, clear voice
        speed: 1.0,
      });

      console.log(`✅ [VOICE SERVICE] Voice query pipeline complete`);

      return {
        transcribedQuery: query,
        enhancedQuery,
        searchResults,
        responseText,
        responseAudio,
      };

    } catch (error: any) {
      console.error('❌ [VOICE SERVICE] Voice query pipeline error:', error);
      throw error;
    }
  }

  /**
   * Generate natural spoken response from search results
   * Private helper for voice query flow
   */
  private generateSearchResponseText(searchResults: any, query: string): string {
    if (!searchResults || !searchResults.results || searchResults.results.length === 0) {
      return `I searched for "${query}" but didn't find any matching emails. Try a different search term.`;
    }

    const count = searchResults.results.length;
    const firstResult = searchResults.results[0];

    let response = `I found ${count} email${count === 1 ? '' : 's'} matching "${query}". `;

    if (count === 1) {
      response += `It's from ${firstResult.from}, with subject: ${firstResult.subject}.`;
    } else {
      response += `The most relevant one is from ${firstResult.from}, about ${firstResult.subject}. `;
      if (count > 2) {
        response += `There are ${count - 1} other matching emails.`;
      }
    }

    return response;
  }

  /**
   * Get MIME type for audio file based on extension
   */
  private getAudioMimeType(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase() || '';

    const mimeTypes: Record<string, string> = {
      'mp3': 'audio/mpeg',
      'mp4': 'audio/mp4',
      'mpeg': 'audio/mpeg',
      'mpga': 'audio/mpeg',
      'm4a': 'audio/mp4',
      'wav': 'audio/wav',
      'webm': 'audio/webm',
    };

    return mimeTypes[extension] || 'audio/mpeg'; // Default to mp3
  }

  /**
   * Get service health status
   * Used for monitoring and debugging
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'unhealthy';
    whisperAvailable: boolean;
    ttsAvailable: boolean;
    apiKeyConfigured: boolean;
  }> {
    const apiKeyConfigured = !!process.env.OPENAI_API_KEY;

    return {
      status: apiKeyConfigured ? 'healthy' : 'unhealthy',
      whisperAvailable: apiKeyConfigured,
      ttsAvailable: apiKeyConfigured,
      apiKeyConfigured,
    };
  }
}

// Export singleton instance
export const voiceService = new VoiceService();
