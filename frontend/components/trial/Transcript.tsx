'use client';

import { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { TrialMessage, RoleType } from '@/types';
import { User, Scale, Gavel, Shield } from 'lucide-react';

interface TranscriptProps {
  messages: TrialMessage[];
}

const roleColors = {
  [RoleType.JUDGE]: 'bg-blue-100 text-blue-700',
  [RoleType.PROSECUTOR]: 'bg-red-100 text-red-700',
  [RoleType.DEFENSE]: 'bg-green-100 text-green-700',
  user: 'bg-gray-100 text-gray-700',
  system: 'bg-gray-50 text-gray-500',
};

const messageBoxColors = {
  [RoleType.JUDGE]: 'bg-blue-50 border-blue-200',
  [RoleType.PROSECUTOR]: 'bg-red-50 border-red-200',
  [RoleType.DEFENSE]: 'bg-green-50 border-green-200',
  user: 'bg-gray-50 border-gray-200',
  system: 'bg-gray-50 border-gray-200',
};

const getRoleIcon = (message: TrialMessage) => {
  if (message.type === 'user') return User;
  if (message.type === 'system') return Scale;
  
  switch (message.role) {
    case RoleType.JUDGE:
      return Gavel;
    case RoleType.PROSECUTOR:
      return Scale;
    case RoleType.DEFENSE:
      return Shield;
    default:
      return User;
  }
};

export function Transcript({ messages }: TranscriptProps) {
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage) {
      scrollToBottom();
    }
  }, [messages.length > 0 ? messages[messages.length - 1]?.content : null]);

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
    <Card className="h-full flex flex-col overflow-hidden border-none shadow-none pt-4 m-0 relative">
      <div 
        className="absolute top-0 left-0 right-0 h-64 pointer-events-none z-10"
        style={{
          background: 'linear-gradient(to bottom, white 0%, white 10%, rgba(255, 255, 255, 0.8) 40%, transparent 100%)'
        }}
      />
      <div className="flex-1 overflow-hidden relative">
        <ScrollArea className="h-full">
        <div className={`space-y-0 ${messages.length > 0 ? 'min-h-full flex flex-col justify-center' : ''}`}>
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>Trial transcript will appear here</p>
              <p className="text-sm mt-2">Start speaking to begin the trial</p>
            </div>
          ) : (
            <>
              {messages.map((message, index) => {
                const Icon = getRoleIcon(message);
                const roleKey = message.type === 'agent' && message.role 
                  ? (message.role as RoleType)
                  : message.type === 'user' ? 'user' : 'system';
                const colorClass = roleColors[roleKey];
                const boxColorClass = messageBoxColors[roleKey];
                const isLast = index === messages.length - 1;
                
                const totalMessages = messages.length;
                const fadeThreshold = 3;
                const opacity = index < fadeThreshold 
                  ? Math.max(0.3, (index + 1) / fadeThreshold)
                  : 1;

                return (
                  <div 
                    key={message.id} 
                    className="relative transition-opacity duration-500"
                    style={{ opacity }}
                  >
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full ${colorClass} flex items-center justify-center flex-shrink-0`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        {!isLast && (
                          <div className="w-0.5 bg-gray-100 flex-1 mt-2" style={{ minHeight: '20px' }} />
                        )}
                      </div>

                      <div className="flex-1 pb-6">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-sm">
                            {getRoleName(message)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(message.timestamp)}
                          </span>
                        </div>
                        <div className={`${boxColorClass} border rounded-md px-3 py-2`}>
                          <p className="text-sm">{message.content}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
        </ScrollArea>
      </div>
    </Card>
  );
}

