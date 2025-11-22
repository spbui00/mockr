'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileUpload } from './FileUpload';
import { Send, Loader2, Bot, User, Gavel } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatInterfaceProps {
  sessionId: string;
  flowId: string;
  onConversationCreated: (conversationId: string) => void;
  onExecutionIdReceived: (executionId: string) => void;
  onFlowComplete: () => void;
  onStartTrial?: () => void;
  isFlowComplete?: boolean;
  isTrialLoading?: boolean;
}

export function ChatInterface({
  sessionId,
  flowId,
  onConversationCreated,
  onExecutionIdReceived,
  onFlowComplete,
  onStartTrial,
  isFlowComplete = false,
  isTrialLoading = false,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState('');
  const [isUserScrolled, setIsUserScrolled] = useState(false);
  const [flowComplete, setFlowComplete] = useState(isFlowComplete);
  
  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasInitializedRef = useRef(false);
  const streamingMessageRef = useRef('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
    const ws = new WebSocket(`${wsUrl}/ws/fact-gathering/${sessionId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      
      ws.send(JSON.stringify({
        type: 'initialize',
        flowId: flowId,
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'connected':
            break;
          
          case 'conversation_created':
            onConversationCreated(data.conversationId);
            break;
          
          case 'user_message':
            setMessages((prev) => [
              ...prev,
              {
                id: `user_${Date.now()}`,
                role: 'user',
                content: data.content,
                timestamp: data.timestamp || new Date().toISOString(),
              },
            ]);
            break;
          
          case 'streaming_start':
            setIsStreaming(true);
            setCurrentStreamingMessage('');
            streamingMessageRef.current = '';
            break;
          
          case 'ai_message':
            const newText = data.text || '';
            streamingMessageRef.current += newText;
            setCurrentStreamingMessage(streamingMessageRef.current);
            break;
          
          case 'awaiting_input':
            setMessages((prev) => {
              const newMessages = [...prev];
              const msgToSave = streamingMessageRef.current;
              if (msgToSave && msgToSave.trim()) {
                newMessages.push({
                  id: `ai_${Date.now()}`,
                  role: 'assistant',
                  content: msgToSave,
                  timestamp: new Date().toISOString(),
                });
              }
              return newMessages;
            });
            setCurrentStreamingMessage('');
            streamingMessageRef.current = '';
            setIsStreaming(false);
            onExecutionIdReceived(data.executionId);
            break;
          
          case 'flow_complete':
            setMessages((prev) => {
              const newMessages = [...prev];
              const msgToSave = streamingMessageRef.current;
              if (msgToSave && msgToSave.trim()) {
                newMessages.push({
                  id: `ai_${Date.now()}`,
                  role: 'assistant',
                  content: msgToSave,
                  timestamp: new Date().toISOString(),
                });
              }
              return newMessages;
            });
            setCurrentStreamingMessage('');
            streamingMessageRef.current = '';
            setIsStreaming(false);
            setFlowComplete(true);
            onFlowComplete();
            break;
          
          case 'streaming_end':
            setIsStreaming(false);
            break;
          
          case 'error':
            console.error('WebSocket error:', data.message);
            alert(`Error: ${data.message}`);
            setIsStreaming(false);
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [sessionId, flowId]);

  const getScrollElement = () => {
    if (!scrollRef.current) return null;
    const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
    if (viewport) return viewport;
    const firstChild = scrollRef.current.firstElementChild as HTMLElement;
    return firstChild || scrollRef.current;
  };

  const checkIfAtBottom = () => {
    const scrollElement = getScrollElement();
    if (!scrollElement) return true;
    const { scrollTop, scrollHeight, clientHeight } = scrollElement;
    const threshold = 100;
    return scrollHeight - scrollTop - clientHeight < threshold;
  };

  const scrollToBottom = () => {
    const scrollElement = getScrollElement();
    if (scrollElement) {
      requestAnimationFrame(() => {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      });
    }
  };

  useEffect(() => {
    if (!isUserScrolled) {
      const timeoutId = setTimeout(() => {
        scrollToBottom();
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [messages, currentStreamingMessage, isUserScrolled]);

  useEffect(() => {
    const handleScroll = () => {
      const atBottom = checkIfAtBottom();
      setIsUserScrolled((prev) => {
        if (atBottom && prev) {
          setTimeout(() => scrollToBottom(), 0);
          return false;
        } else if (!atBottom && !prev) {
          return true;
        }
        return prev;
      });
    };

    const scrollElement = getScrollElement();
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        scrollElement.removeEventListener('scroll', handleScroll);
      };
    }
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 200;
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [inputText]);

  const handleSendMessage = () => {
    if (!inputText.trim() || !wsRef.current || !isConnected || isStreaming) return;

    wsRef.current.send(JSON.stringify({
      type: 'message',
      text: inputText.trim(),
    }));

    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleFileUpload = (file: File) => {
    if (!wsRef.current || !isConnected) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result?.toString().split(',')[1];
      
      wsRef.current?.send(JSON.stringify({
        type: 'upload',
        file: base64,
        filename: file.name,
      }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
    <div className="mb-4">
    <div className="flex items-center justify-between p-4 rounded-lg shadow-lg">
      <h2 className="font-semibold text-lg">Case Discussion</h2>
      <div className="flex items-center space-x-2">
        <div
          className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`}
        />
        <span className="text-sm text-muted-foreground">
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
    </div>
  </div>
    <Card className="h-[calc(100vh-200px)] max-h-[800px] flex flex-col shadow-2xl border-none backdrop-blur-sm bg-card/95">

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`flex items-start space-x-2 max-w-[80%] ${
                    message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                  }`}
                >
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>
                  <div
                    className={`px-4 py-2 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <div className="text-sm">
                        <ReactMarkdown
                          remarkPlugins={[remarkBreaks]}
                          components={{
                            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                            em: ({ children }) => <em className="italic">{children}</em>,
                            ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                            li: ({ children }) => <li className="ml-2">{children}</li>,
                            h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                            code: ({ children }) => <code className="bg-muted-foreground/20 px-1 py-0.5 rounded text-xs">{children}</code>,
                            blockquote: ({ children }) => <blockquote className="border-l-4 border-muted-foreground/30 pl-4 italic my-2">{children}</blockquote>,
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isStreaming && currentStreamingMessage && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="flex items-start space-x-2 max-w-[80%]">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="px-4 py-2 rounded-lg bg-muted">
                  <div className="text-sm">
                    <ReactMarkdown
                      remarkPlugins={[remarkBreaks]}
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        em: ({ children }) => <em className="italic">{children}</em>,
                        ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                        li: ({ children }) => <li className="ml-2">{children}</li>,
                        h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                        code: ({ children }) => <code className="bg-muted-foreground/20 px-1 py-0.5 rounded text-xs">{children}</code>,
                        blockquote: ({ children }) => <blockquote className="border-l-4 border-muted-foreground/30 pl-4 italic my-2">{children}</blockquote>,
                      }}
                    >
                      {currentStreamingMessage}
                    </ReactMarkdown>
                  </div>
                  <Loader2 className="h-3 w-3 animate-spin mt-1 text-muted-foreground" />
                </div>
              </div>
            </motion.div>
          )}

          {isStreaming && !currentStreamingMessage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="flex items-start space-x-2">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="px-4 py-2 rounded-lg bg-muted">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t space-y-3">
        <FileUpload onFileSelect={handleFileUpload} disabled={!isConnected || isStreaming} />
        
        <div className="flex space-x-2 items-end">
          <Textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Type your message..."
            disabled={!isConnected || isStreaming}
            className="flex-1 resize-none overflow-y-auto min-h-[40px] max-h-[200px]"
            rows={1}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputText.trim() || !isConnected || isStreaming}
            className="mb-0"
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
          {flowComplete && onStartTrial && (
            <div className="mb-0 rounded-lg p-[2px] bg-gradient-to-r from-red-600 to-black group">
              <Button
                onClick={onStartTrial}
                disabled={isTrialLoading}
                className="w-full h-full bg-card hover:bg-gradient-to-r hover:from-red-600 hover:to-black active:bg-gradient-to-r active:from-red-600 active:to-black focus:bg-gradient-to-r focus:from-red-600 focus:to-black border-0 rounded-md px-4 py-2 transition-all duration-300 hover:opacity-100 focus-visible:ring-0 focus-visible:ring-offset-0"
              >
                <span className="flex flex-row items-center font-medium">
                  <span className="bg-gradient-to-r from-red-600 to-black bg-clip-text text-transparent group-hover:hidden flex flex-row items-center transition-all duration-300">
                    {isTrialLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin text-red-600" />
                        <span>Trial It!</span>
                      </>
                    ) : (
                      <>
                        <Gavel className="h-4 w-4 mr-2 text-red-600" />
                        <span>Trial It!</span>
                      </>
                    )}
                  </span>
                  <span className="hidden group-hover:flex flex-row items-center text-white transition-all duration-300">
                    {isTrialLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin text-white" />
                        <span>Trial It!</span>
                      </>
                    ) : (
                      <>
                        <Gavel className="h-4 w-4 mr-2 text-white" />
                        <span>Trial It!</span>
                      </>
                    )}
                  </span>
                </span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
    </>
  );
}

