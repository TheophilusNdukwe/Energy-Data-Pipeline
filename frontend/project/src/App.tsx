import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import StatusOverview from './components/StatusOverview';
import RealTimePipelineMonitor from './components/RealTimePipelineMonitor';
import DataQualityPanel from './components/DataQualityPanel';
import RealTimeEnergyVisualization from './components/RealTimeEnergyVisualization';
import ApiStatusPanel from './components/ApiStatusPanel';
import ConfigurationPanel from './components/ConfigurationPanel';
import WebSocketStatus from './components/WebSocketStatus';
import { useGeneralWebSocket, WebSocketMessage } from './hooks/useWebSocket';

function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [realtimeData, setRealtimeData] = useState<{
    energyUpdates: number;
    weatherUpdates: number;
    qualityUpdates: number;
    pipelineUpdates: number;
  }>({
    energyUpdates: 0,
    weatherUpdates: 0,
    qualityUpdates: 0,
    pipelineUpdates: 0
  });

  // WebSocket connection for real-time updates
  const { isConnected, lastMessage } = useGeneralWebSocket((message: WebSocketMessage) => {
    // Handle different types of real-time messages
    switch (message.type) {
      case 'energy_data':
        setRealtimeData(prev => ({ ...prev, energyUpdates: prev.energyUpdates + 1 }));
        break;
      case 'weather_data':
        setRealtimeData(prev => ({ ...prev, weatherUpdates: prev.weatherUpdates + 1 }));
        break;
      case 'quality_update':
        setRealtimeData(prev => ({ ...prev, qualityUpdates: prev.qualityUpdates + 1 }));
        break;
      case 'pipeline_status':
        setRealtimeData(prev => ({ ...prev, pipelineUpdates: prev.pipelineUpdates + 1 }));
        break;
    }
    
    setLastUpdate(new Date());
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Check backend connection on startup
  useEffect(() => {
    checkBackendConnection();
    
    // Check connection every 30 seconds
    const interval = setInterval(checkBackendConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  // Update connection status based on WebSocket
  useEffect(() => {
    setConnectionStatus(isConnected ? 'connected' : 'disconnected');
  }, [isConnected]);

  const checkBackendConnection = async () => {
    try {
      const response = await fetch('/health', { 
        signal: AbortSignal.timeout(5000) 
      });
      if (response.ok) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('disconnected');
      }
    } catch (error) {
      console.error('Backend connection check failed:', error);
      setConnectionStatus('disconnected');
    }
  };

  const renderActiveTab = () => {
    // Show connection warning for data-heavy tabs when disconnected
    if (connectionStatus === 'disconnected' && ['visualization', 'pipeline', 'apis'].includes(activeTab)) {
      return (
        <div className="max-w-2xl mx-auto py-12 text-center">
          <div className="bg-white rounded-xl shadow-sm border border-red-200 p-8">
            <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Backend Connection Required</h2>
            <p className="text-gray-600 mb-6">
              Unable to connect to the backend API. This tab requires a live connection to display data.
            </p>
            <div className="text-sm text-gray-500 mb-6">
              <p className="mb-2">To view live data, make sure your backend is running:</p>
              <div className="text-left bg-gray-50 p-4 rounded-lg font-mono text-xs">
                <div>cd energy-pipeline-backend</div>
                <div>docker-compose up -d</div>
              </div>
            </div>
            <div className="flex space-x-3 justify-center">
              <button 
                onClick={checkBackendConnection}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Retry Connection
              </button>
              <button 
                onClick={() => setActiveTab('overview')}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Go to Overview
              </button>
            </div>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            <WebSocketStatus className="mb-6" />
            {/* Real-time Data Summary */}
            {isConnected && Object.values(realtimeData).some(count => count > 0) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-800 mb-2">📡 Real-time Updates Today</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-900">{realtimeData.energyUpdates}</div>
                    <div className="text-blue-700">Energy Updates</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-900">{realtimeData.weatherUpdates}</div>
                    <div className="text-blue-700">Weather Updates</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-900">{realtimeData.qualityUpdates}</div>
                    <div className="text-blue-700">Quality Updates</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-900">{realtimeData.pipelineUpdates}</div>
                    <div className="text-blue-700">Pipeline Updates</div>
                  </div>
                </div>
              </div>
            )}
            <StatusOverview lastUpdate={lastUpdate} />
          </div>
        );
      case 'pipeline':
        return <RealTimePipelineMonitor />;
      case 'quality':
        return <DataQualityPanel />;
      case 'visualization':
        return <RealTimeEnergyVisualization />;
      case 'apis':
        return <ApiStatusPanel />;
      case 'config':
        return <ConfigurationPanel />;
      default:
        return (
          <div className="space-y-6">
            <WebSocketStatus className="mb-6" />
            <StatusOverview lastUpdate={lastUpdate} />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        connectionStatus={connectionStatus}
      />
      
      {/* Real-time Connection Status Banner */}
      {connectionStatus === 'disconnected' && (
        <div className="bg-red-50 border-b border-red-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-red-700">
                  Backend disconnected - Real-time features unavailable
                </span>
              </div>
              <button 
                onClick={checkBackendConnection}
                className="text-sm text-red-700 hover:text-red-800 underline"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}
      
      {connectionStatus === 'connected' && (
        <div className="bg-green-50 border-b border-green-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-700">
                  {isConnected ? '🔴 Live: Real-time updates active' : 'Connected to backend API'}
                </span>
              </div>
              {lastMessage && (
                <div className="text-xs text-green-600">
                  Last update: {new Date(lastMessage.timestamp).toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderActiveTab()}
      </main>
    </div>
  );
}

export default App;
