'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { AudioRecorder, playAudioFromBase64, blobToBase64 } from '@/lib/audio';
import { TrialWebSocket } from '@/lib/websocket';
import { motion } from 'framer-motion';

interface VoiceInterfaceProps {
  sessionId: string;
  onMessage: (data: any) => void;
  currentlySpeakingAgent: string | null;
}

export function VoiceInterface({
  sessionId,
  onMessage,
  currentlySpeakingAgent,
}: VoiceInterfaceProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [audioLevel, setAudioLevel] = useState(0);
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
        console.log('WebSocket connected');
      })
      .catch((error) => {
        console.error('WebSocket connection failed:', error);
        setConnectionStatus('disconnected');
      });

    ws.on('*', (data) => {
      console.log('WebSocket message:', data);
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        e.stopPropagation();
        
        if (!e.repeat) {
          console.log('[VOICE] Space key pressed');
          handleMouseDown();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        e.stopPropagation();
        console.log('[VOICE] Space key released');
        handleMouseUp();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp, { passive: false });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [connectionStatus, isProcessing, micPermission, isRecording]);

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

    console.log('[VOICE] Starting recording (push-to-speak)...');
    try {
      await recorderRef.current.start();
      setIsRecording(true);

      const checkAudioLevel = setInterval(() => {
        setAudioLevel(Math.random());
      }, 100);

      (recorderRef.current as any).intervalId = checkAudioLevel;
    } catch (error: any) {
      console.error('[VOICE] Error starting recording:', error);
      const message = error.message || 'Failed to access microphone. Please check permissions.';
      alert(message);
    }
  };

  const stopRecording = async () => {
    if (!recorderRef.current || !wsRef.current || !isRecording) return;

    console.log('[VOICE] Stopping recording and processing audio...');
    try {
      clearInterval((recorderRef.current as any).intervalId);
      setAudioLevel(0);

      console.log('[VOICE] Getting audio blob...');
      const audioBlob = await recorderRef.current.stop();
      console.log(`[VOICE] Got audio blob: ${audioBlob.size} bytes`);
      setIsRecording(false);

      if (audioBlob.size < 1000) {
        console.log('[VOICE] Audio blob too small, skipping send');
        return;
      }

      setIsProcessing(true);

      console.log('[VOICE] Converting to base64...');
      const audioBase64 = await blobToBase64(audioBlob);
      console.log(`[VOICE] Base64 length: ${audioBase64.length} chars`);

      console.log('[VOICE] Sending audio via WebSocket...');
      wsRef.current.send({
        type: 'audio',
        audio: audioBase64,
      });
      console.log('[VOICE] Audio sent successfully');
    } catch (error) {
      console.error('[VOICE] Error stopping recording:', error);
      setIsProcessing(false);
    }
  };

  const handleMouseDown = async () => {
    if (connectionStatus !== 'connected' || isProcessing || micPermission !== 'granted' || isPlayingRef.current) {
      console.log('[VOICE] Cannot start recording:', { connectionStatus, isProcessing, micPermission, isPlaying: isPlayingRef.current });
      return;
    }
    await startRecording();
  };

  const handleMouseUp = async () => {
    if (isRecording) {
      await stopRecording();
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {micPermission === 'prompt' && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
              Microphone access required for voice trial
            </p>
            <Button onClick={requestMicrophonePermission} size="sm" variant="outline">
              <Mic className="mr-2 h-4 w-4" />
              Enable Microphone
            </Button>
          </div>
        )}

        {micPermission === 'denied' && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm text-red-800 dark:text-red-200 mb-2">
              Microphone access denied. Please enable it in your browser settings:
            </p>
            <ul className="text-xs text-red-700 dark:text-red-300 list-disc ml-4 space-y-1">
              <li>Click the 🔒 or ⓘ icon in your browser's address bar</li>
              <li>Find "Microphone" or "Permissions" section</li>
              <li>Change microphone permission to "Allow"</li>
              <li>Reload this page</li>
            </ul>
          </div>
        )}

        <div className="flex items-center justify-center space-x-4">
          <div className="text-center">
            <div className="relative inline-block">
              <Button
                size="lg"
                variant={isRecording ? 'destructive' : 'default'}
                className="w-24 h-24 rounded-full"
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleMouseDown}
                onTouchEnd={handleMouseUp}
                disabled={connectionStatus !== 'connected' || isProcessing || micPermission !== 'granted'}
              >
                  <Mic className="h-12 w-12" />
              </Button>

              {isRecording && (
                <motion.div
                  className="absolute inset-0 rounded-full border-4 border-red-500"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.8, 0, 0.8],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              )}
            </div>

            <div className="mt-4">
              <p className="font-medium">
                {connectionStatus === 'connecting' && 'Connecting...'}
                {connectionStatus === 'connected' && !isRecording && !isProcessing && 'Hold to Speak'}
                {connectionStatus === 'connected' && isRecording && 'Recording...'}
                {connectionStatus === 'disconnected' && 'Disconnected'}
              </p>
              {isProcessing && (
                <p className="text-sm text-muted-foreground flex items-center justify-center mt-2">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </p>
              )}
              {currentlySpeakingAgent && (
                <p className="text-sm text-primary mt-2">
                  {currentlySpeakingAgent} is speaking...
                </p>
              )}
            </div>
          </div>
        </div>

          {isRecording && (
          <div className="flex items-center justify-center space-x-2">
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                className="w-1 bg-primary rounded-full"
                animate={{
                  height: [8, Math.random() * 40 + 10, 8],
                }}
                transition={{
                  duration: 0.5,
                  repeat: Infinity,
                  delay: i * 0.05,
                }}
              />
            ))}
          </div>
        )}

        <div className="text-center text-sm text-muted-foreground">
          <p>Hold <kbd className="px-2 py-1 text-xs font-semibold bg-muted border border-border rounded">Space</kbd> to speak</p>
          <p className="mt-1">Release to send - the AI agents will respond</p>
        </div>
      </div>
    </Card>
  );
}

