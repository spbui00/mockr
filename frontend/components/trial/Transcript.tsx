'use client';

import { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { TrialMessage, RoleType } from '@/types';

interface TranscriptProps {
  messages: TrialMessage[];
}

const roleColors = {
  [RoleType.JUDGE]: 'text-blue-600',
  [RoleType.PROSECUTOR]: 'text-red-600',
  [RoleType.DEFENSE]: 'text-green-600',
  user: 'text-gray-600',
  system: 'text-gray-400',
};

export function Transcript({ messages }: TranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getRoleName = (message: TrialMessage) => {
    if (message.type === 'user') return 'You';
    if (message.type === 'system') return 'System';
    if (message.role) {
      return message.role.charAt(0).toUpperCase() + message.role.slice(1);
    }
    return 'Unknown';
  };

  return (
    <Card className="h-full">
      <ScrollArea className="h-[400px] p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>Trial transcript will appear here</p>
              <p className="text-sm mt-2">Start speaking to begin the trial</p>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="border-b pb-3 last:border-b-0">
                <div className="flex items-baseline justify-between mb-1">
                  <span
                    className={`font-semibold ${
                      roleColors[message.role as RoleType] || roleColors[message.type]
                    }`}
                  >
                    {getRoleName(message)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(message.timestamp)}
                  </span>
                </div>
                <p className="text-sm">{message.content}</p>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}

