import React from 'react';
import { 
  Activity, 
  Database, 
  Shield, 
  BarChart3, 
  Globe, 
  Settings,
  Zap
} from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  connectionStatus?: 'connected' | 'disconnected' | 'checking';
}

const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, connectionStatus = 'checking' }) => {
  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'pipeline', label: 'Pipeline', icon: Database },
    { id: 'quality', label: 'Data Quality', icon: Shield },
    { id: 'visualization', label: 'Analytics', icon: BarChart3 },
    { id: 'apis', label: 'API Status', icon: Globe },
    { id: 'config', label: 'Configuration', icon: Settings },
  ];

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Energy Pipeline</h1>
              <p className="text-sm text-gray-500">Data Management Dashboard</p>
            </div>
          </div>

          <nav className="hidden md:flex space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' : 
                connectionStatus === 'disconnected' ? 'bg-red-500 animate-pulse' : 
                'bg-yellow-500 animate-pulse'
              }`}></div>
              <span className="text-sm text-gray-600">
                {connectionStatus === 'connected' ? 'Live' : 
                 connectionStatus === 'disconnected' ? 'Offline' : 
                 'Connecting...'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="md:hidden border-t bg-gray-50">
        <div className="flex overflow-x-auto px-4 py-2 space-x-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};

export default Header;