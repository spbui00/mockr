'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { ChatInterface } from '@/components/fact-gathering/ChatInterface';
import { motion } from 'framer-motion';
import { RoleType } from '@/types';

export default function FactGatheringPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = params.sessionId as string;
  const factFlowId = searchParams.get('factFlowId');
  const trialFlowId = searchParams.get('trialFlowId');
  const rolesParam = searchParams.get('roles');
  
  const [audioLevel, setAudioLevel] = useState(0);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<RoleType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (rolesParam) {
      const roles = rolesParam.split(',') as RoleType[];
      setSelectedRoles(roles);
    } else {
      setSelectedRoles([RoleType.JUDGE, RoleType.PROSECUTOR, RoleType.DEFENSE]);
    }
  }, [rolesParam]);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const initAudio = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

        const updateAudioLevel = () => {
          if (analyserRef.current) {
            analyserRef.current.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
            setAudioLevel(average / 255);
          }
          animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        };

        updateAudioLevel();
      } catch (err) {
        console.error('Microphone access denied:', err);
      }
    };

    initAudio();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const handleConversationCreated = (convId: string) => {
    setConversationId(convId);
  };

  const handleStartTrial = async () => {
    if (!conversationId) {
      alert('No conversation ID available. Please complete fact gathering first.');
      return;
    }

    if (selectedRoles.length === 0) {
      alert('No roles selected. Please go back and select at least one role.');
      return;
    }

    if (!trialFlowId) {
      alert('No trial flow ID available.');
      return;
    }

    setIsLoading(true);

    try {
      const trialRequest = {
        conversationId,
        flowId: trialFlowId,
        roles: selectedRoles.map((role) => ({
          role,
          enabled: true,
        })),
        legal_properties: {
          jurisdiction: 'us',
          legal_areas: ['criminal'],
          articles: [],
          case_law: [],
        },
      };

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/api/trial/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(trialRequest),
      });

      if (!response.ok) {
        throw new Error('Failed to create trial');
      }

      const data = await response.json();
      router.push(`/trial/${data.session_id}`);
    } catch (error) {
      console.error('Error creating trial:', error);
      alert('Failed to start trial. Please try again.');
      setIsLoading(false);
    }
  };

  if (!factFlowId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4 overflow-hidden relative">
      <div className="absolute inset-0 flex items-center justify-center gap-1 px-4 opacity-25">
        {[...Array(80)].map((_, i) => {
          const centerDistance = Math.abs(i - 40) / 40;
          const baseHeight = 50 + Math.sin(i * 0.3) * 30;
          const audioMultiplier = Math.pow(audioLevel, 0.7) * 600 * (1 - centerDistance * 0.5);
          const height = baseHeight + audioMultiplier;
          
          return (
            <motion.div
              key={i}
              className="flex-1 bg-gradient-to-b from-red-300 via-red-500 to-red-300 rounded-lg"
              style={{
                minWidth: '2px',
              }}
              animate={{
                height: `${height}px`,
                opacity: 0.4 + audioLevel * 0.6,
              }}
              transition={{
                duration: 0.05,
                ease: 'easeOut',
              }}
            />
          );
        })}
      </div>

      <div className="w-full max-w-4xl relative z-10">
        <ChatInterface
          sessionId={sessionId}
          flowId={factFlowId}
          onConversationCreated={handleConversationCreated}
          onExecutionIdReceived={() => {}}
          onFlowComplete={() => {}}
          onStartTrial={handleStartTrial}
          isTrialLoading={isLoading}
        />
      </div>
    </div>
  );
}

