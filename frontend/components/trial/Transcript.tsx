'use client';

import { useEffect, useRef, useState } from 'react';
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
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [shouldAlignTop, setShouldAlignTop] = useState(false);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [initialHeight, setInitialHeight] = useState<number>(800);
  const [contentHeight, setContentHeight] = useState<number>(0);

  const getViewport = () => {
    if (!scrollAreaRef.current) return null;
    return scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
  };

  const contentExceedsViewport = () => {
    const viewport = getViewport();
    if (!viewport || !contentRef.current) return false;
    return contentRef.current.scrollHeight > viewport.clientHeight;
  };

  const shouldAutoScroll = () => {
    if (!contentExceedsViewport()) return false;
    
    const viewport = getViewport();
    if (!viewport) return false;
    
    const scrollTop = viewport.scrollTop;
    const scrollHeight = viewport.scrollHeight;
    const viewportHeight = viewport.clientHeight;
    const threshold = 100;
    
    return scrollHeight - scrollTop - viewportHeight < threshold;
  };

  const scrollToBottom = (force: boolean = false) => {
    const viewport = getViewport();
    if (!viewport || !messagesEndRef.current) return;
    
    if (force || shouldAutoScroll()) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const checkContentHeight = () => {
      const viewport = getViewport();
      if (!viewport) {
        setShouldAlignTop(false);
        setViewportHeight(null);
        return;
      }
      
      if (viewport.style.height !== '100%') {
        viewport.style.height = '100%';
      }
      
      const height = viewport.clientHeight || viewport.offsetHeight;
      setViewportHeight(height);
      
      if (contentRef.current) {
        const scrollHeight = contentRef.current.scrollHeight;
        setContentHeight(scrollHeight);
        setShouldAlignTop(scrollHeight > height);
      }
    };
    
    checkContentHeight();
    const timeoutId = setTimeout(checkContentHeight, 100);
    const timeoutId2 = setTimeout(checkContentHeight, 300);
    const timeoutId3 = setTimeout(checkContentHeight, 500);
    
    const contentElement = contentRef.current;
    const viewport = getViewport();
    
    if (!viewport) {
      return () => {
        clearTimeout(timeoutId);
        clearTimeout(timeoutId2);
        clearTimeout(timeoutId3);
      };
    }
    
    const resizeObserver = new ResizeObserver(() => {
      checkContentHeight();
    });
    
    resizeObserver.observe(viewport);
    if (contentElement) {
      resizeObserver.observe(contentElement);
    }
    
    return () => {
      clearTimeout(timeoutId);
      clearTimeout(timeoutId2);
      clearTimeout(timeoutId3);
      resizeObserver.disconnect();
    };
  }, [messages]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setInitialHeight(window.innerHeight * 0.8);
    }
    
    const initViewport = () => {
      const viewport = getViewport();
      if (viewport) {
        if (viewport.style.height !== '100%') {
          viewport.style.height = '100%';
        }
        const height = viewport.clientHeight || viewport.offsetHeight || viewport.getBoundingClientRect().height;
        if (height > 0) {
          setViewportHeight(height);
        } else {
          const parent = viewport.parentElement;
          if (parent) {
            const parentHeight = parent.clientHeight || parent.offsetHeight;
            if (parentHeight > 0) {
              setViewportHeight(parentHeight);
            }
          }
        }
      }
    };
    
    initViewport();
    const timeoutId = setTimeout(initViewport, 50);
    const timeoutId2 = setTimeout(initViewport, 200);
    const timeoutId3 = setTimeout(initViewport, 500);
    
    return () => {
      clearTimeout(timeoutId);
      clearTimeout(timeoutId2);
      clearTimeout(timeoutId3);
    };
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      const isAgentMessage = lastMessage?.type === 'agent';
      
      const scroll = () => {
        if (isAgentMessage) {
          scrollToBottom(true);
        } else {
          scrollToBottom(false);
        }
      };
      
      const timeoutId = setTimeout(scroll, 50);
      const timeoutId2 = setTimeout(scroll, 150);
      const timeoutId3 = setTimeout(scroll, 300);
      
      return () => {
        clearTimeout(timeoutId);
        clearTimeout(timeoutId2);
        clearTimeout(timeoutId3);
      };
    }
  }, [messages.length, messages.length > 0 ? messages[messages.length - 1]?.id : null]);

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
        className="absolute top-0 left-0 right-0 h-28 pointer-events-none z-10"
        style={{
          background: 'linear-gradient(to bottom, white 0%, white 10%, rgba(255, 255, 255, 0.8) 30%, rgba(255, 255, 255, 0.4) 50%, transparent 65%)'
        }}
      />
      <div className="flex-1 overflow-hidden relative">
        <ScrollArea className="h-full w-full" ref={scrollAreaRef}>
        <div 
          ref={wrapperRef}
          className="flex justify-center px-4 w-full" 
          style={{ 
            display: 'flex',
            height: viewportHeight ? `${viewportHeight}px` : `${initialHeight}px`,
            minHeight: viewportHeight ? `${viewportHeight}px` : `${initialHeight}px`,
            alignItems: shouldAlignTop ? 'flex-start' : 'center',
            justifyContent: 'center',
            boxSizing: 'border-box'
          }}
        >
        <div className="space-y-0 w-full max-w-3xl" ref={contentRef}>
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
                
                const shouldFade = viewportHeight && contentHeight > viewportHeight * 0.9;
                
                let opacity = 1;
                if (shouldFade) {
                  const fadeThreshold = 3;
                  if (index < fadeThreshold) {
                    opacity = Math.max(0.3, (index + 1) / fadeThreshold);
                  }
                }

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
        </div>
        </ScrollArea>
      </div>
    </Card>
  );
}

