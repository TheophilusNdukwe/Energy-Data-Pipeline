// frontend/project/src/hooks/useWebSocket.ts - FULLY FIXED VERSION
import { useState, useEffect, useRef, useCallback } from 'react';

export interface WebSocketMessage {
  id: string;
  type: 'energy_data' | 'weather_data' | 'quality_update' | 'pipeline_status' | 'system_health' | 'connection_ack' | 'error' | 'heartbeat';
  data: any;
  timestamp: string;
  server_time: string;
}

export interface WebSocketHookConfig {
  url: string;
  channels?: string[];
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

export interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastMessage: WebSocketMessage | null;
  connectionCount: number;
  messageCount: number;
}

export const useWebSocket = (config: WebSocketHookConfig) => {
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastMessage: null,
    connectionCount: 0,
    messageCount: 0
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const mountedRef = useRef(true);
  const stateRef = useRef(state); // FIXED: Use ref to track state without causing re-renders

  // Update state ref when state changes
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const {
    url,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    onMessage,
    onConnect,
    onDisconnect,
    onError
  } = config;

  const connect = useCallback(() => {
    // FIXED: Use stateRef.current instead of state to avoid dependency
    if (!mountedRef.current || stateRef.current.isConnecting || stateRef.current.isConnected) {
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      // Create WebSocket URL - Use relative URL to leverage Vite proxy
      let wsUrl: string;
      
      if (url.startsWith('ws://') || url.startsWith('wss://')) {
        // Full URL provided
        wsUrl = url;
      } else {
        // Relative URL - let Vite proxy handle it in development
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host; // This includes the port (e.g., "localhost:3000")
        wsUrl = `${protocol}//${host}${url}`;
      }

      console.log(`🔌 Attempting WebSocket connection to: ${wsUrl}`);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;

        console.log('✅ WebSocket connected successfully');
        reconnectAttemptsRef.current = 0;
        
        setState(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          error: null,
          connectionCount: prev.connectionCount + 1
        }));

        onConnect?.();
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
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        if (!mountedRef.current) return;

        console.log('🔌 WebSocket connection closed:', event.code, event.reason);
        
        setState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false
        }));

        wsRef.current = null;
        onDisconnect?.();

        // Attempt reconnection if not a manual close
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = reconnectInterval * Math.pow(1.5, reconnectAttemptsRef.current);
          console.log(`🔄 Attempting reconnection in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = window.setTimeout(() => {
            if (mountedRef.current) {
              reconnectAttemptsRef.current++;
              connect();
            }
          }, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setState(prev => ({
            ...prev,
            error: `Failed to reconnect after ${maxReconnectAttempts} attempts`
          }));
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        
        setState(prev => ({
          ...prev,
          error: 'WebSocket connection error',
          isConnecting: false
        }));

        onError?.(error);
      };

    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to create WebSocket connection',
        isConnecting: false
      }));
    }
    // FIXED: Removed state.isConnecting and state.isConnected from dependencies
  }, [url, reconnectInterval, maxReconnectAttempts, onMessage, onConnect, onDisconnect, onError]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close(1000, 'Manual disconnect');
    }

    wsRef.current = null;
    setState(prev => ({
      ...prev,
      isConnected: false,
      isConnecting: false
    }));
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  // Auto-connect on mount - FIXED: Only connect once on mount
  useEffect(() => {
    connect();

    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, []); // FIXED: Empty dependency array to prevent re-connection on every render

  return {
    ...state,
    connect,
    disconnect,
    sendMessage
  };
};

// Specialized hooks for different data types
export const useEnergyWebSocket = (onMessage?: (message: WebSocketMessage) => void) => {
  return useWebSocket({
    url: '/ws/energy',
    onMessage
  });
};

export const useWeatherWebSocket = (onMessage?: (message: WebSocketMessage) => void) => {
  return useWebSocket({
    url: '/ws/weather',
    onMessage
  });
};

export const useQualityWebSocket = (onMessage?: (message: WebSocketMessage) => void) => {
  return useWebSocket({
    url: '/ws/quality',
    onMessage
  });
};

export const usePipelineWebSocket = (onMessage?: (message: WebSocketMessage) => void) => {
  return useWebSocket({
    url: '/ws/pipeline',
    onMessage
  });
};

export const useGeneralWebSocket = (onMessage?: (message: WebSocketMessage) => void) => {
  return useWebSocket({
    url: '/ws',
    onMessage
  });
};
