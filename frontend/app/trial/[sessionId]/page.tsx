'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Bubble } from '@/components/trial/Bubble';
import { Transcript } from '@/components/trial/Transcript';
import { useVoiceRecording } from '@/lib/useVoiceRecording';
import { Agent, TrialMessage, RoleType } from '@/types';
import { Loader2, Mic, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';

export default function TrialPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [messages, setMessages] = useState<TrialMessage[]>([]);
  const [currentlySpeakingAgent, setCurrentlySpeakingAgent] = useState<string | null>(null);
  const [currentlyThinkingAgent, setCurrentlyThinkingAgent] = useState<string | null>(null);
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

    if (data.type === 'agent_thinking') {
      if (data.role) {
        const agent = agents.find((a) => a.role === data.role);
        const agentName = agent?.name || data.role;
        console.log('[TRIAL_PAGE] Agent thinking:', agentName);
        setCurrentlyThinkingAgent(agentName);
      } else {
        console.log('[TRIAL_PAGE] All agents thinking');
        setCurrentlyThinkingAgent('all');
      }
    }

    if (data.type === 'agent_response') {
      setCurrentlyThinkingAgent(null);
    }

    if (data.type === 'synthesizing') {
      const agent = agents.find((a) => a.role === data.role);
      const speakerName = agent?.name || data.role || 'Agent';
      console.log('[TRIAL_PAGE] Agent synthesizing speech:', speakerName, 'role:', data.role);
      setCurrentlySpeakingAgent(speakerName);
    }

    if (data.type === 'agent_audio') {
      const agent = agents.find((a) => a.role === data.role);
      const speakerName = agent?.name || data.role;
      console.log('[TRIAL_PAGE] Agent audio received:', speakerName, 'role:', data.role, 'agents:', agents.length);
      setCurrentlySpeakingAgent(speakerName);
    }
  };

  const {
    isRecording,
    isProcessing,
    connectionStatus,
    micPermission,
    audioAnalyser,
    handlePressStart,
    handlePressEnd,
    requestMicrophonePermission,
  } = useVoiceRecording({
    sessionId,
    onMessage: handleWebSocketMessage,
    onAudioFinished: () => {
      console.log('[TRIAL_PAGE] Audio finished, clearing speaking state');
      setCurrentlySpeakingAgent(null);
    },
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

  const handleBackClick = () => {
    console.log('[TRIAL_PAGE] Back button clicked, trialInfo:', trialInfo);
    
    if (trialInfo) {
      const conversationId = trialInfo.conversation_id || sessionId;
      const params = new URLSearchParams();
      if (trialInfo.fact_flow_id) params.append('factFlowId', trialInfo.fact_flow_id);
      if (trialInfo.trial_flow_id) params.append('trialFlowId', trialInfo.trial_flow_id);
      if (trialInfo.roles && trialInfo.roles.length > 0) {
        params.append('roles', trialInfo.roles.join(','));
      }
      const queryString = params.toString();
      const targetUrl = `/fact-gathering/${conversationId}${queryString ? `?${queryString}` : ''}`;
      console.log('[TRIAL_PAGE] Navigating to:', targetUrl);
      router.push(targetUrl);
    } else {
      console.log('[TRIAL_PAGE] No trialInfo, using sessionId');
      router.push(`/fact-gathering/${sessionId}`);
    }
  };

  return (
    <div className="h-screen bg-white p-8 lg:p-10 overflow-hidden relative">
      <motion.div
        onClick={handleBackClick}
        className="fixed left-0 top-1/2 -translate-y-1/2 w-32 h-[50vh] z-50 flex items-center justify-center group"
        style={{ cursor: 'pointer' }}
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          className="pointer-events-none"
          initial={{ scale: 0.5, opacity: 0 }}
          whileHover={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronLeft className="w-32 h-32 text-primary/60" strokeWidth={1.5} />
        </motion.div>
      </motion.div>
      <div className="flex flex-col lg:flex-row gap-8 h-full">
        <div className="flex flex-col gap-0 w-full lg:w-2/5 py-0">
          <div className="flex flex-wrap items-center justify-center gap-0">
            {agents.map((agent) => (
              <Bubble
                key={agent.role}
                agent={agent}
                isSpeaking={
                  currentlySpeakingAgent?.toLowerCase().includes(agent.role.toLowerCase()) ||
                  false
                }
                isThinking={
                  currentlyThinkingAgent === 'all' ||
                  currentlyThinkingAgent?.toLowerCase().includes(agent.role.toLowerCase()) ||
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
              audioAnalyser={audioAnalyser || undefined}
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
                {isProcessing && (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Processing...</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="w-full lg:w-3/5 flex flex-col min-h-0">
          <div className="flex-1 min-h-0">
            <Transcript messages={messages} />
          </div>
        </div>
      </div>
    </div>
  );
}

