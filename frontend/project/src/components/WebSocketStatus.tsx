// frontend/project/src/components/WebSocketStatus.tsx
import React from 'react';
import { useGeneralWebSocket, WebSocketMessage } from '../hooks/useWebSocket';

interface WebSocketStatusProps {
  onMessage?: (message: WebSocketMessage) => void;
  className?: string;
}

const WebSocketStatus: React.FC<WebSocketStatusProps> = ({ onMessage, className = '' }) => {
  const [recentMessages, setRecentMessages] = React.useState<WebSocketMessage[]>([]);
  const [showDetails, setShowDetails] = React.useState(false);

  const { 
    isConnected, 
    isConnecting, 
    error, 
    connectionCount, 
    messageCount,
    connect,
    disconnect 
  } = useGeneralWebSocket((message) => {
    // Add to recent messages (keep last 10)
    setRecentMessages(prev => [message, ...prev].slice(0, 10));
    
    // Call parent callback
    onMessage?.(message);
  });

  const getStatusIcon = () => {
    if (isConnecting) {
      return (
        <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
      );
    } else if (isConnected) {
      return (
        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
      );
    } else {
      return (
        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
      );
    }
  };

  const getStatusText = () => {
    if (isConnecting) return 'Connecting...';
    if (isConnected) return 'Real-time Connected';
    if (error) return `Error: ${error}`;
    return 'Disconnected';
  };

  const getStatusColor = () => {
    if (isConnecting) return 'text-yellow-700';
    if (isConnected) return 'text-green-700';
    return 'text-red-700';
  };

  const formatMessageType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'energy_data':
        return '⚡';
      case 'weather_data':
        return '🌤️';
      case 'quality_update':
        return '📊';
      case 'pipeline_status':
        return '🔄';
      case 'system_health':
        return '❤️';
      case 'heartbeat':
        return '💓';
      default:
        return '📡';
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Main Status Header */}
      <div 
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <div>
              <div className={`font-medium ${getStatusColor()}`}>
                {getStatusText()}
              </div>
              <div className="text-sm text-gray-500">
                {isConnected && `${messageCount} messages received`}
                {isConnecting && 'Establishing connection...'}
                {!isConnected && !isConnecting && 'Click to reconnect'}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {isConnected && (
              <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                Live
              </div>
            )}
            <svg 
              className={`w-4 h-4 text-gray-400 transition-transform ${showDetails ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Detailed Status Panel */}
      {showDetails && (
        <div className="border-t border-gray-200">
          <div className="p-4 space-y-4">
            {/* Connection Stats */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-500">Connection Count</div>
                <div className="font-medium">{connectionCount}</div>
              </div>
              <div>
                <div className="text-gray-500">Messages Received</div>
                <div className="font-medium">{messageCount}</div>
              </div>
            </div>

            {/* Connection Controls */}
            <div className="flex space-x-2">
              {isConnected ? (
                <button
                  onClick={disconnect}
                  className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={connect}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                  disabled={isConnecting}
                >
                  {isConnecting ? 'Connecting...' : 'Reconnect'}
                </button>
              )}
            </div>

            {/* Recent Messages */}
            {recentMessages.length > 0 && (
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Recent Messages
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {recentMessages.map((message, index) => (
                    <div 
                      key={`${message.id}-${index}`}
                      className="flex items-start space-x-2 text-xs bg-gray-50 p-2 rounded"
                    >
                      <span className="text-lg">{getMessageIcon(message.type)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-700">
                            {formatMessageType(message.type)}
                          </span>
                          <span className="text-gray-500">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        {message.data && typeof message.data === 'object' && (
                          <div className="text-gray-600 mt-1 truncate">
                            {message.data.message || 
                             message.data.event || 
                             JSON.stringify(message.data).substring(0, 50) + '...'}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <div className="text-sm text-red-700">
                  <strong>Connection Error:</strong> {error}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WebSocketStatus;
