'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ChatInterface } from '@/components/fact-gathering/ChatInterface';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RoleType } from '@/types';
import { ArrowLeft, Loader2, Play } from 'lucide-react';

export default function FactGatheringPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = params.sessionId as string;
  const factFlowId = searchParams.get('factFlowId');
  const trialFlowId = searchParams.get('trialFlowId');
  const rolesParam = searchParams.get('roles');

  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [flowComplete, setFlowComplete] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<RoleType[]>([]);

  useEffect(() => {
    if (rolesParam) {
      const roles = rolesParam.split(',') as RoleType[];
      setSelectedRoles(roles);
    } else {
      setSelectedRoles([RoleType.JUDGE, RoleType.PROSECUTOR, RoleType.DEFENSE]);
    }
  }, [rolesParam]);

  const handleFlowComplete = () => {
    setFlowComplete(true);
  };

  const handleConversationCreated = (convId: string) => {
    setConversationId(convId);
  };

  const handleExecutionIdReceived = (execId: string) => {
    setExecutionId(execId);
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

    setLoading(true);

    try {
      const trialRequest = {
        conversationId,
        flowId: trialFlowId || '',
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
      setLoading(false);
    }
  };

  if (!factFlowId || !trialFlowId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6 max-w-md">
          <h2 className="text-xl font-bold mb-2">Missing Flow IDs</h2>
          <p className="text-muted-foreground mb-4">
            Both Fact-Gathering and Trial Flow IDs are required.
          </p>
          <Button onClick={() => router.push('/')}>Go Back</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Fact Gathering</h1>
            <p className="text-muted-foreground">
              Discuss your case with the AI to gather relevant facts
            </p>
            {selectedRoles.length > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                Selected roles: {selectedRoles.map(r => r.charAt(0).toUpperCase() + r.slice(1)).join(', ')}
              </p>
            )}
            {conversationId && (
              <p className="text-xs text-muted-foreground mt-1">
                Conversation ID: {conversationId}
              </p>
            )}
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => router.push('/')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={handleStartTrial}
              disabled={!conversationId || loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Start Trial
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto">
          <ChatInterface
            sessionId={sessionId}
            flowId={factFlowId}
            onConversationCreated={handleConversationCreated}
            onExecutionIdReceived={handleExecutionIdReceived}
            onFlowComplete={handleFlowComplete}
          />
        </div>

        {flowComplete && (
          <div className="fixed bottom-8 right-8">
            <Card className="p-4 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
              <p className="text-sm text-green-800 dark:text-green-200 mb-2">
                Fact gathering complete! Ready to start the trial.
              </p>
              <Button
                onClick={handleStartTrial}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700"
                size="sm"
              >
                {loading ? 'Starting...' : 'Start Trial Now'}
              </Button>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

