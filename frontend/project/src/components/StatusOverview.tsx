import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Clock,
  Database,
  Activity,
  Zap,
  RefreshCw,
  Play
} from 'lucide-react';
import { EnergyPipelineAPI, HealthStatus, PipelineStatus } from '../services/api';

interface StatusOverviewProps {
  lastUpdate: Date;
}

const StatusOverview: React.FC<StatusOverviewProps> = ({ lastUpdate }) => {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningPipeline, setRunningPipeline] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      setError(null);
      
      const [health, pipeline] = await Promise.all([
        EnergyPipelineAPI.getHealth(),
        EnergyPipelineAPI.getPipelineStatus()
      ]);
      
      setHealthStatus(health);
      setPipelineStatus(pipeline);
    } catch (err) {
      console.error('Error fetching status:', err);
      setError('Failed to fetch system status. Check if backend is running and accessible.');
    } finally {
      setLoading(false);
    }
  };

  const runEnergyPipeline = async () => {
    try {
      setRunningPipeline('energy');
      
      await EnergyPipelineAPI.runEnergyIngestion({
        regions: ['CAL', 'NYIS', 'US48'],
        days_back: 3
      });
      
      // Refresh status after a delay
      setTimeout(() => {
        fetchStatus();
        setRunningPipeline(null);
      }, 5000);
      
    } catch (err) {
      console.error('Error running energy pipeline:', err);
      setError('Failed to run energy pipeline');
      setRunningPipeline(null);
    }
  };

  const runWeatherPipeline = async () => {
    try {
      setRunningPipeline('weather');
      
      await EnergyPipelineAPI.runWeatherIngestion({
        cities: ['Boston', 'New York', 'Los Angeles', 'Chicago']
      });
      
      // Refresh status after a delay
      setTimeout(() => {
        fetchStatus();
        setRunningPipeline(null);
      }, 3000);
      
    } catch (err) {
      console.error('Error running weather pipeline:', err);
      setError('Failed to run weather pipeline');
      setRunningPipeline(null);
    }
  };

  const getSystemStatus = () => {
    if (!healthStatus) return { status: 'unknown', color: 'gray' };
    
    if (healthStatus.status === 'healthy' && healthStatus.database === 'connected') {
      return { status: 'healthy', color: 'green' };
    } else if (healthStatus.database === 'disconnected') {
      return { status: 'error', color: 'red' };
    } else {
      return { status: 'warning', color: 'orange' };
    }
  };

  const statusCards = [
    {
      title: 'System Health',
      value: healthStatus?.status === 'healthy' ? 'Healthy' : loading ? 'Loading...' : 'Issues',
      status: getSystemStatus().status,
      icon: healthStatus?.status === 'healthy' ? CheckCircle : AlertTriangle,
      details: `Database: ${healthStatus?.database || 'Unknown'}`,
      change: healthStatus?.database === 'connected' ? 'All systems online' : 'Connection issues'
    },
    {
      title: 'Energy Records',
      value: loading ? 'Loading...' : (pipelineStatus?.data_status?.energy_records_last_30_days?.toLocaleString() || '0'),
      status: (pipelineStatus?.data_status?.energy_records_last_30_days || 0) > 0 ? 'success' : 'warning',
      icon: Database,
      details: 'Last 30 days',
      change: (pipelineStatus?.data_status?.energy_records_last_30_days || 0) > 0 ? 'Data available' : 'No data - run pipeline'
    },
    {
      title: 'Weather Records',
      value: loading ? 'Loading...' : (pipelineStatus?.data_status?.weather_records_available?.toString() || '0'),
      status: (pipelineStatus?.data_status?.weather_records_available || 0) > 0 ? 'success' : 'warning',
      icon: Activity,
      details: 'Available records',
      change: (pipelineStatus?.data_status?.weather_records_available || 0) > 0 ? 'Current data' : 'No data - run pipeline'
    },
    {
      title: 'API Keys',
      value: loading ? 'Loading...' : [
        healthStatus?.api_keys?.eia_configured && 'EIA',
        healthStatus?.api_keys?.weather_configured && 'Weather'
      ].filter(Boolean).length.toString() + '/2',
      status: (healthStatus?.api_keys?.eia_configured && healthStatus?.api_keys?.weather_configured) ? 'success' : 'warning',
      icon: AlertTriangle,
      details: 'Configured',
      change: 'Check .env file if issues'
    }
  ];

  const recentActivities = [
    {
      time: new Date().toLocaleTimeString(),
      message: loading ? 'Checking system status...' : (error ? 'Status check failed' : 'System status updated'),
      type: loading ? 'info' : (error ? 'error' : 'success'),
      details: error || `Energy: ${pipelineStatus?.data_status?.energy_records_last_30_days || 0}, Weather: ${pipelineStatus?.data_status?.weather_records_available || 0} records`
    },
    {
      time: pipelineStatus?.data_status?.last_updated ? new Date(pipelineStatus.data_status.last_updated).toLocaleTimeString() : 'Unknown',
      message: 'Data status last updated',
      type: 'info',
      details: `${pipelineStatus?.data_status?.energy_records_last_30_days || 0} energy records available`
    },
    {
      time: runningPipeline ? 'Running...' : 'Ready',
      message: runningPipeline ? `${runningPipeline} pipeline running` : 'Pipelines ready for execution',
      type: runningPipeline ? 'info' : 'success',
      details: runningPipeline ? 'Please wait...' : 'Click buttons below to run'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-orange-600 bg-orange-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-blue-500" />;
    }
  };

  if (loading && !healthStatus) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading system status...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <XCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-800">{error}</span>
          </div>
          <div className="mt-2 text-sm text-red-600">
            <p>Try refreshing or check:</p>
            <ul className="list-disc list-inside mt-1">
              <li>Backend is running: docker-compose ps</li>
              <li>Visit: http://localhost:8000/health</li>
              <li>Check browser console (F12) for errors</li>
            </ul>
          </div>
        </div>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statusCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg ${getStatusColor(card.status)}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs text-gray-500">{card.change}</span>
              </div>
              
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-gray-600">{card.title}</h3>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                <p className="text-xs text-gray-500">{card.details}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">System Activity</h2>
                <span className="text-sm text-gray-500">
                  Last updated: {lastUpdate.toLocaleTimeString()}
                </span>
              </div>
            </div>
            
            <div className="divide-y divide-gray-200">
              {recentActivities.map((activity, index) => (
                <div key={index} className="p-6 hover:bg-gray-50 transition-colors duration-150">
                  <div className="flex items-start space-x-3">
                    {getActivityIcon(activity.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                        <span className="text-xs text-gray-500">{activity.time}</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{activity.details}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pipeline Controls */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            
            <div className="space-y-3">
              <button 
                onClick={runEnergyPipeline}
                disabled={runningPipeline === 'energy' || loading}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {runningPipeline === 'energy' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                <span>Run Energy Pipeline</span>
              </button>
              
              <button 
                onClick={runWeatherPipeline}
                disabled={runningPipeline === 'weather' || loading}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {runningPipeline === 'weather' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                <span>Run Weather Pipeline</span>
              </button>
              
              <button 
                onClick={fetchStatus}
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh Status</span>
              </button>
            </div>
            
            {!healthStatus?.api_keys?.eia_configured && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">⚠️ EIA API key not configured</p>
                <p className="text-xs text-yellow-600 mt-1">Add EIA_API_KEY to .env file</p>
              </div>
            )}
            
            {!healthStatus?.api_keys?.weather_configured && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">⚠️ Weather API key not configured</p>
                <p className="text-xs text-yellow-600 mt-1">Add OPENWEATHER_API_KEY to .env file</p>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-sm text-white p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Zap className="w-6 h-6" />
              <h3 className="text-lg font-semibold">System Stats</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-blue-100">Energy Records</span>
                <span className="font-bold">{loading ? '...' : (pipelineStatus?.data_status?.energy_records_last_30_days?.toLocaleString() || '0')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-blue-100">Weather Records</span>
                <span className="font-bold">{loading ? '...' : (pipelineStatus?.data_status?.weather_records_available || '0')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-blue-100">API Status</span>
                <span className="font-bold">
                  {loading ? '...' : (healthStatus?.api_keys?.eia_configured && healthStatus?.api_keys?.weather_configured ? '✅ Ready' : '⚠️ Issues')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusOverview;
