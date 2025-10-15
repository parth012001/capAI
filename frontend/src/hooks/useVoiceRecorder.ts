/**
 * useVoiceRecorder Hook
 * Handles microphone access, recording, and audio blob management
 */

import { useState, useRef, useCallback } from 'react';

export type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';

export interface UseVoiceRecorderReturn {
  // State
  recordingState: RecordingState;
  audioBlob: Blob | null;
  audioUrl: string | null;
  duration: number; // Recording duration in seconds
  error: string | null;
  isSupported: boolean;

  // Actions
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  resetRecording: () => void;

  // Permissions
  requestPermission: () => Promise<boolean>;
}

export const useVoiceRecorder = (): UseVoiceRecorderReturn => {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check if browser supports MediaRecorder
  const isSupported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

  /**
   * Request microphone permission
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Your browser does not support voice recording');
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately (we just wanted to check permission)
      stream.getTracks().forEach(track => track.stop());
      setError(null);
      return true;
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Microphone permission denied. Please enable it in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone and try again.');
      } else {
        setError('Could not access microphone: ' + err.message);
      }
      return false;
    }
  }, [isSupported]);

  /**
   * Start recording
   */
  const startRecording = useCallback(async (): Promise<void> => {
    if (!isSupported) {
      setError('Voice recording is not supported in your browser');
      return;
    }

    try {
      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      streamRef.current = stream;

      // Create MediaRecorder with best available format
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Handle data available event
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Handle stop event
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);

        // Create URL for audio playback
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Stop duration counter
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
          durationIntervalRef.current = null;
        }

        setRecordingState('stopped');
      };

      // Start recording
      mediaRecorder.start();
      startTimeRef.current = Date.now();
      setRecordingState('recording');
      setError(null);

      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setDuration(elapsed);
      }, 100); // Update every 100ms for smooth display

    } catch (err: any) {
      console.error('Failed to start recording:', err);
      if (err.name === 'NotAllowedError') {
        setError('Microphone permission denied');
      } else {
        setError('Failed to start recording: ' + err.message);
      }
    }
  }, [isSupported]);

  /**
   * Stop recording
   */
  const stopRecording = useCallback((): void => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.stop();

      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  }, [recordingState]);

  /**
   * Pause recording
   */
  const pauseRecording = useCallback((): void => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.pause();
      setRecordingState('paused');

      // Pause duration counter
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }
  }, [recordingState]);

  /**
   * Resume recording
   */
  const resumeRecording = useCallback((): void => {
    if (mediaRecorderRef.current && recordingState === 'paused') {
      mediaRecorderRef.current.resume();
      setRecordingState('recording');

      // Resume duration counter
      startTimeRef.current = Date.now() - duration * 1000;
      durationIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setDuration(elapsed);
      }, 100);
    }
  }, [recordingState, duration]);

  /**
   * Reset recording (clear audio and state)
   */
  const resetRecording = useCallback((): void => {
    // Clean up old audio URL
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    // Stop any ongoing recording
    if (mediaRecorderRef.current && recordingState === 'recording') {
      stopRecording();
    }

    // Clear state
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setRecordingState('idle');
    setError(null);
    audioChunksRef.current = [];

    // Stop duration counter
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, [audioUrl, recordingState, stopRecording]);

  return {
    recordingState,
    audioBlob,
    audioUrl,
    duration,
    error,
    isSupported,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    requestPermission,
  };
};
