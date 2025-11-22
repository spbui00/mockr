'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Bubble } from '@/components/trial/Bubble';
import { Transcript } from '@/components/trial/Transcript';
import { useVoiceRecording } from '@/lib/useVoiceRecording';
import { Agent, TrialMessage, RoleType } from '@/types';
import { Loader2, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function TrialPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [messages, setMessages] = useState<TrialMessage[]>([]);
  const [currentlySpeakingAgent, setCurrentlySpeakingAgent] = useState<string | null>(null);
  const [trialInfo, setTrialInfo] = useState<any>(null);

  const handleWebSocketMessage = (data: any) => {
    console.log('[TRIAL_PAGE] Handling WebSocket message:', data.type);
    
    if (data.type === 'user_message' || data.type === 'agent_response') {
      const newMessage: TrialMessage = {
        id: `${data.type}_${Date.now()}_${Math.random()}`,
        type: data.type === 'user_message' ? 'user' : 'agent',
        role: data.role as RoleType,
        content: data.content || data.text,
        timestamp: data.timestamp || new Date().toISOString(),
      };
      console.log('[TRIAL_PAGE] Adding message:', newMessage.id, newMessage.type);
      setMessages((prev) => [...prev, newMessage]);
    }

    if (data.type === 'transcription') {
      console.log('[TRIAL_PAGE] Transcription received (not adding to messages, waiting for user_message)');
    }

    if (data.type === 'agent_response') {
      setCurrentlySpeakingAgent(null);
    }

    if (data.type === 'agent_audio') {
      const agent = agents.find((a) => a.role === data.role);
      setCurrentlySpeakingAgent(agent?.name || data.role);

      setTimeout(() => {
        setCurrentlySpeakingAgent(null);
      }, 5000);
    }

    if (data.type === 'synthesizing') {
      setCurrentlySpeakingAgent('Agent');
    }
  };

  const {
    isRecording,
    isProcessing,
    connectionStatus,
    micPermission,
    handlePressStart,
    handlePressEnd,
    requestMicrophonePermission,
  } = useVoiceRecording({
    sessionId,
    onMessage: handleWebSocketMessage,
  });

  useEffect(() => {
    fetchTrialSession();
  }, [sessionId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        e.stopPropagation();
        handlePressStart();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        e.stopPropagation();
        handlePressEnd();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp, { passive: false });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handlePressStart, handlePressEnd]);

  const fetchTrialSession = async () => {
    console.log(`[TRIAL_PAGE] Fetching trial session: ${sessionId}`);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const url = `${backendUrl}/api/trial/${sessionId}`;
      console.log(`[TRIAL_PAGE] Fetching from: ${url}`);
      
      const response = await fetch(url);
      console.log(`[TRIAL_PAGE] Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[TRIAL_PAGE] Error response: ${errorText}`);
        throw new Error('Failed to fetch trial session');
      }

      const data = await response.json();
      console.log(`[TRIAL_PAGE] Session data received:`, data);
      console.log(`[TRIAL_PAGE] Agents: ${data.agents?.length || 0}`);
      
      setAgents(data.agents);
      setMessages(data.messages || []);
      setTrialInfo(data);
      setLoading(false);
    } catch (error) {
      console.error('[TRIAL_PAGE] Error fetching trial session:', error);
      alert('Failed to load trial session');
      router.push('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6 lg:p-10">
      <div className="flex flex-col lg:flex-row gap-8 h-full">
        <div className="flex flex-col gap-6 w-full lg:w-1/2">
          <div className="flex flex-wrap items-center justify-center gap-10 py-4">
            {agents.map((agent) => (
              <Bubble
                key={agent.role}
                agent={agent}
                isSpeaking={
                  currentlySpeakingAgent?.toLowerCase().includes(agent.role.toLowerCase()) ||
                  false
                }
              />
            ))}
          </div>

          <div className="flex justify-center py-4">
            <Bubble
              isUser
              speaker
              isSpeaking={isRecording}
              onPressStart={handlePressStart}
              onPressEnd={handlePressEnd}
              disabled={connectionStatus !== 'connected' || isProcessing || micPermission !== 'granted'}
            />
          </div>

          <div className="flex-1 flex flex-col items-center justify-center">
            {micPermission === 'prompt' && (
              <Card className="p-6 max-w-md">
                <div className="text-center space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Microphone access required for voice trial
                  </p>
                  <Button onClick={requestMicrophonePermission} size="lg">
                    <Mic className="mr-2 h-4 w-4" />
                    Enable Microphone
                  </Button>
                </div>
              </Card>
            )}

            {micPermission === 'denied' && (
              <Card className="p-6 max-w-md">
                <div className="text-center space-y-4">
                  <p className="text-sm text-destructive font-medium">
                    Microphone access denied
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Please enable microphone permissions in your browser settings and reload the page.
                  </p>
                </div>
              </Card>
            )}

            {micPermission === 'granted' && (
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  {connectionStatus === 'connecting' && 'Connecting...'}
                  {connectionStatus === 'connected' && !isRecording && !isProcessing && (
                    <>Hold the bubble or press <kbd className="px-2 py-1 text-xs font-semibold bg-muted border border-border rounded">Space</kbd> to speak</>
                  )}
                  {connectionStatus === 'connected' && isRecording && 'Recording... Release to send'}
                  {connectionStatus === 'disconnected' && 'Disconnected - Please refresh'}
                </p>
                {isProcessing && (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Processing...</span>
                  </div>
                )}
                {currentlySpeakingAgent && (
                  <p className="text-sm text-primary font-medium">
                    {currentlySpeakingAgent} is speaking...
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="w-full lg:w-1/2 flex flex-col">
          <h2 className="text-2xl font-bold mb-4">Trial Transcript</h2>
          <div className="flex-1">
            <Transcript messages={messages} />
          </div>
        </div>
      </div>
    </div>
  );
}

