// frontend/project/src/hooks/useWebSocketSimple.ts - SIMPLE BACKUP VERSION
import { useState, useEffect, useRef } from 'react';

export interface WebSocketMessage {
  id: string;
  type: string;
  data: any;
  timestamp: string;
  server_time: string;
}

export interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastMessage: WebSocketMessage | null;
  messageCount: number;
}

export const useWebSocketSimple = (url: string, onMessage?: (message: WebSocketMessage) => void) => {
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastMessage: null,
    messageCount: 0
  });

  const wsRef = useRef<WebSocket | null>(null);
  const mountedRef = useRef(true);

  const connect = () => {
    if (wsRef.current || state.isConnecting) return;

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host; // Use host with port (e.g., "localhost:3000")
      const wsUrl = url.startsWith('ws') ? url : `${protocol}//${host}${url}`;

      console.log(`🔌 Connecting to: ${wsUrl}`);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        console.log('✅ WebSocket connected');
        setState(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          error: null
        }));
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setState(prev => ({
            ...prev,
            lastMessage: message,
            messageCount: prev.messageCount + 1
          }));
          onMessage?.(message);
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        console.log('🔌 WebSocket closed');
        setState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false
        }));
        wsRef.current = null;
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setState(prev => ({
          ...prev,
          error: 'WebSocket connection error',
          isConnecting: false
        }));
      };

    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to create WebSocket',
        isConnecting: false
      }));
    }
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setState(prev => ({
      ...prev,
      isConnected: false,
      isConnecting: false
    }));
  };

  useEffect(() => {
    connect();
    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, []);

  return {
    ...state,
    connect,
    disconnect
  };
};

// Simple versions of specialized hooks
export const useGeneralWebSocketSimple = (onMessage?: (message: WebSocketMessage) => void) => {
  return useWebSocketSimple('/ws', onMessage);
};

export const useEnergyWebSocketSimple = (onMessage?: (message: WebSocketMessage) => void) => {
  return useWebSocketSimple('/ws/energy', onMessage);
};

export const usePipelineWebSocketSimple = (onMessage?: (message: WebSocketMessage) => void) => {
  return useWebSocketSimple('/ws/pipeline', onMessage);
};
