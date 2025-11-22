'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AgentCircle } from '@/components/trial/AgentCircle';
import { Transcript } from '@/components/trial/Transcript';
import { VoiceInterface } from '@/components/trial/VoiceInterface';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Agent, TrialMessage, RoleType } from '@/types';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function TrialPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [messages, setMessages] = useState<TrialMessage[]>([]);
  const [currentlySpeakingAgent, setCurrentlySpeakingAgent] = useState<string | null>(null);
  const [trialInfo, setTrialInfo] = useState<any>(null);

  useEffect(() => {
    fetchTrialSession();
  }, [sessionId]);

  const fetchTrialSession = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/api/trial/${sessionId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch trial session');
      }

      const data = await response.json();
      setAgents(data.agents);
      setMessages(data.messages || []);
      setTrialInfo(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching trial session:', error);
      alert('Failed to load trial session');
      router.push('/');
    }
  };

  const handleWebSocketMessage = (data: any) => {
    if (data.type === 'user_message' || data.type === 'agent_response') {
      const newMessage: TrialMessage = {
        id: `msg_${messages.length}`,
        type: data.type === 'user_message' ? 'user' : 'agent',
        role: data.role as RoleType,
        content: data.content || data.text,
        timestamp: data.timestamp || new Date().toISOString(),
      };
      setMessages((prev) => [...prev, newMessage]);
    }

    if (data.type === 'transcription') {
      const newMessage: TrialMessage = {
        id: `msg_${messages.length}`,
        type: 'user',
        content: data.text,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, newMessage]);
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

  const handleEndTrial = async () => {
    if (confirm('Are you sure you want to end this trial?')) {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
        await fetch(`${backendUrl}/api/trial/${sessionId}`, {
          method: 'DELETE',
        });
        router.push('/');
      } catch (error) {
        console.error('Error ending trial:', error);
      }
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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Mock Trial in Session</h1>
            <p className="text-muted-foreground">Session ID: {sessionId}</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => router.push('/')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button variant="destructive" onClick={handleEndTrial}>
              End Trial
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card className="lg:col-span-3 p-8">
            <div className="flex justify-around items-center">
              {agents.map((agent) => (
                <AgentCircle
                  key={agent.role}
                  agent={agent}
                  isSpeaking={
                    currentlySpeakingAgent?.toLowerCase().includes(agent.role.toLowerCase()) ||
                    false
                  }
                />
              ))}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Voice Interface</h2>
            <VoiceInterface
              sessionId={sessionId}
              onMessage={handleWebSocketMessage}
              currentlySpeakingAgent={currentlySpeakingAgent}
            />
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Trial Transcript</h2>
            <Transcript messages={messages} />
          </div>
        </div>
      </div>
    </div>
  );
}

