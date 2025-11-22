'use client';

import { useState, useEffect, useRef } from 'react';
import { AudioRecorder, playAudioFromBase64, blobToBase64 } from '@/lib/audio';
import { TrialWebSocket } from '@/lib/websocket';

interface UseVoiceRecordingProps {
  sessionId: string;
  onMessage: (data: any) => void;
}

export function useVoiceRecording({ sessionId, onMessage }: UseVoiceRecordingProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');

  const recorderRef = useRef<AudioRecorder | null>(null);
  const wsRef = useRef<TrialWebSocket | null>(null);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    const ws = new TrialWebSocket(sessionId);
    wsRef.current = ws;

    ws.connect()
      .then(() => {
        setConnectionStatus('connected');
      })
      .catch((error) => {
        console.error('WebSocket connection failed:', error);
        setConnectionStatus('disconnected');
      });

    ws.on('*', (data) => {
      onMessage(data);

      if (data.type === 'agent_audio' && data.audio) {
        handleAgentAudio(data.audio);
      }

      if (data.type === 'agent_response' || data.type === 'transcription' || data.type === 'processing') {
        if (data.type !== 'processing') {
          setIsProcessing(false);
        }
      }
    });

    recorderRef.current = new AudioRecorder();
    checkMicrophonePermission();

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [sessionId]);

  const checkMicrophonePermission = async () => {
    try {
      const hasPermission = await recorderRef.current?.checkPermission();
      setMicPermission(hasPermission ? 'granted' : 'prompt');
    } catch (error) {
      console.log('Permission check not supported');
    }
  };

  const requestMicrophonePermission = async () => {
    if (!recorderRef.current) return;

    try {
      await recorderRef.current.start();
      setMicPermission('granted');
      await recorderRef.current.stop();
    } catch (error: any) {
      console.error('Permission denied:', error);
      setMicPermission('denied');
      alert(error.message || 'Microphone access denied. Please enable microphone permissions in your browser settings.');
    }
  };

  const handleAgentAudio = async (audioBase64: string) => {
    if (isPlayingRef.current) return;

    isPlayingRef.current = true;
    try {
      await playAudioFromBase64(audioBase64);
    } catch (error) {
      console.error('Error playing audio:', error);
    } finally {
      isPlayingRef.current = false;
    }
  };

  const startRecording = async () => {
    if (!recorderRef.current || isPlayingRef.current || isProcessing) return;

    try {
      await recorderRef.current.start();
      setIsRecording(true);
    } catch (error: any) {
      console.error('[VOICE] Error starting recording:', error);
      const message = error.message || 'Failed to access microphone. Please check permissions.';
      alert(message);
    }
  };

  const stopRecording = async () => {
    if (!recorderRef.current || !wsRef.current || !isRecording) return;

    try {
      const audioBlob = await recorderRef.current.stop();
      setIsRecording(false);

      if (audioBlob.size < 1000) {
        return;
      }

      setIsProcessing(true);

      const audioBase64 = await blobToBase64(audioBlob);

      wsRef.current.send({
        type: 'audio',
        audio: audioBase64,
      });
    } catch (error) {
      console.error('[VOICE] Error stopping recording:', error);
      setIsProcessing(false);
    }
  };

  const handlePressStart = async () => {
    if (connectionStatus !== 'connected' || isProcessing || micPermission !== 'granted' || isPlayingRef.current) {
      return;
    }
    await startRecording();
  };

  const handlePressEnd = async () => {
    if (isRecording) {
      await stopRecording();
    }
  };

  return {
    isRecording,
    isProcessing,
    connectionStatus,
    micPermission,
    handlePressStart,
    handlePressEnd,
    requestMicrophonePermission,
  };
}

