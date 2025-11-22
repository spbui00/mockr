'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileUpload } from './FileUpload';
import { Send, Loader2, Bot, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
}

export function ChatInterface({
  sessionId,
  flowId,
  onConversationCreated,
  onExecutionIdReceived,
  onFlowComplete,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState('');
  
  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasInitializedRef = useRef(false);
  const streamingMessageRef = useRef('');

  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
    const ws = new WebSocket(`${wsUrl}/ws/fact-gathering/${sessionId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      
      ws.send(JSON.stringify({
        type: 'initialize',
        flowId: flowId,
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message:', data);
        
        switch (data.type) {
          case 'connected':
            console.log('Session connected:', data.session_id);
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
              console.log('Messages after awaiting_input:', newMessages.length, 'Saved message:', msgToSave?.substring(0, 50));
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
              console.log('Messages after flow_complete:', newMessages.length, 'Saved message:', msgToSave?.substring(0, 50));
              return newMessages;
            });
            setCurrentStreamingMessage('');
            streamingMessageRef.current = '';
            setIsStreaming(false);
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
      console.log('WebSocket closed');
      setIsConnected(false);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [sessionId, flowId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentStreamingMessage]);

  const handleSendMessage = () => {
    if (!inputText.trim() || !wsRef.current || !isConnected || isStreaming) return;

    wsRef.current.send(JSON.stringify({
      type: 'message',
      text: inputText.trim(),
    }));

    setInputText('');
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
    <Card className="h-[calc(100vh-250px)] flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
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
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
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
                  <p className="text-sm whitespace-pre-wrap">{currentStreamingMessage}</p>
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
        
        <div className="flex space-x-2">
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Type your message..."
            disabled={!isConnected || isStreaming}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputText.trim() || !isConnected || isStreaming}
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}

