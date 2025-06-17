import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import StatusOverview from './components/StatusOverview';
import PipelineMonitor from './components/PipelineMonitor';
import DataQualityPanel from './components/DataQualityPanel';
import EnergyVisualization from './components/EnergyVisualization';
import ApiStatusPanel from './components/ApiStatusPanel';
import ConfigurationPanel from './components/ConfigurationPanel';

function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');

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
        return <StatusOverview lastUpdate={lastUpdate} />;
      case 'pipeline':
        return <PipelineMonitor />;
      case 'quality':
        return <DataQualityPanel />;
      case 'visualization':
        return <EnergyVisualization />;
      case 'apis':
        return <ApiStatusPanel />;
      case 'config':
        return <ConfigurationPanel />;
      default:
        return <StatusOverview lastUpdate={lastUpdate} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        connectionStatus={connectionStatus}
      />
      
      {/* Connection Status Banner */}
      {connectionStatus === 'disconnected' && (
        <div className="bg-red-50 border-b border-red-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-red-700">
                  Backend disconnected - Some features may not work properly
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
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-700">
                Connected to backend API
              </span>
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
