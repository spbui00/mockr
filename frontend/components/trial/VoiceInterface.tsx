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
  const [isMuted, setIsMuted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [audioLevel, setAudioLevel] = useState(0);

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

      if (data.type === 'agent_response' || data.type === 'transcription') {
        setIsProcessing(false);
      }
    });

    recorderRef.current = new AudioRecorder();

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [sessionId]);

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
    if (!recorderRef.current || isPlayingRef.current) return;

    try {
      await recorderRef.current.start();
      setIsRecording(true);

      const checkAudioLevel = setInterval(() => {
        setAudioLevel(Math.random());
      }, 100);

      (recorderRef.current as any).intervalId = checkAudioLevel;
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Failed to access microphone. Please check permissions.');
    }
  };

  const stopRecording = async () => {
    if (!recorderRef.current || !wsRef.current) return;

    try {
      clearInterval((recorderRef.current as any).intervalId);
      setAudioLevel(0);

      const audioBlob = await recorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);

      const audioBase64 = await blobToBase64(audioBlob);

      wsRef.current.send({
        type: 'audio',
        audio: audioBase64,
      });
    } catch (error) {
      console.error('Error stopping recording:', error);
      setIsProcessing(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  useEffect(() => {
    let isActive = true;

    const handleContinuousRecording = async () => {
      if (!isMuted && !isPlayingRef.current && connectionStatus === 'connected') {
        if (!isRecording) {
          await startRecording();
        }
      }
    };

    const interval = setInterval(() => {
      if (isActive) {
        handleContinuousRecording();
      }
    }, 100);

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [isMuted, isRecording, connectionStatus]);

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-center space-x-4">
          <div className="text-center">
            <div className="relative inline-block">
              <Button
                size="lg"
                variant={isRecording ? 'destructive' : 'default'}
                className="w-24 h-24 rounded-full"
                onClick={() => setIsMuted(!isMuted)}
                disabled={connectionStatus !== 'connected' || isProcessing}
              >
                {isMuted ? (
                  <MicOff className="h-12 w-12" />
                ) : (
                  <Mic className="h-12 w-12" />
                )}
              </Button>

              {isRecording && !isMuted && (
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
                {connectionStatus === 'connected' &&
                  (isMuted ? 'Microphone Muted' : 'Listening...')}
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

        {isRecording && !isMuted && (
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
          <p>Click the microphone to {isMuted ? 'unmute' : 'mute'}</p>
          <p className="mt-1">Speak naturally - the AI agents will respond</p>
        </div>
      </div>
    </Card>
  );
}

