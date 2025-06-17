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

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const renderActiveTab = () => {
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
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderActiveTab()}
      </main>
    </div>
  );
}

export default App;