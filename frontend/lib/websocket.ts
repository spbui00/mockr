import { WebSocketMessage } from '@/types';

export class TrialWebSocket {
  private ws: WebSocket | null = null;
  private sessionId: string;
  private messageHandlers: Map<string, (data: any) => void> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
      const fullUrl = `${wsUrl}/ws/trial/${this.sessionId}`;
      console.log(`[WS] Connecting to: ${fullUrl}`);
      console.log(`[WS] Session ID: ${this.sessionId}`);
      
      this.ws = new WebSocket(fullUrl);

      this.ws.onopen = () => {
        console.log(`[WS] Connection opened for session ${this.sessionId}`);
        this.reconnectAttempts = 0;
        resolve();
      };

      this.ws.onerror = (error) => {
        console.error('[WS] WebSocket error:', error);
        reject(error);
      };

      this.ws.onmessage = (event) => {
        console.log(`[WS] Message received:`, event.data);
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          console.log(`[WS] Parsed message type: ${data.type}`);
          const handler = this.messageHandlers.get(data.type);
          if (handler) {
            handler(data);
          }
          const allHandler = this.messageHandlers.get('*');
          if (allHandler) {
            allHandler(data);
          }
        } catch (error) {
          console.error('[WS] Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log(`[WS] Connection closed for session ${this.sessionId}`);
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`[WS] Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
          setTimeout(() => {
            this.connect();
          }, 2000 * this.reconnectAttempts);
        }
      };
    });
  }

  on(messageType: string, handler: (data: any) => void): void {
    this.messageHandlers.set(messageType, handler);
  }

  send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log(`[WS] Sending message:`, data);
      this.ws.send(JSON.stringify(data));
    } else {
      console.error(`[WS] Cannot send - WebSocket is not connected (state: ${this.ws?.readyState})`);
    }
  }

  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

