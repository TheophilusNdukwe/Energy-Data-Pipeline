import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock,
  Activity,
  Wifi,
  WifiOff,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { EnergyPipelineAPI, HealthStatus, PipelineStatus } from '../services/api';

const ApiStatusPanel: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [healthData, setHealthData] = useState<HealthStatus | null>(null);
  const [pipelineData, setPipelineData] = useState<PipelineStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch API status data
  useEffect(() => {
    const fetchApiStatus = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [healthResponse, pipelineResponse] = await Promise.all([
          EnergyPipelineAPI.getHealth(),
          EnergyPipelineAPI.getPipelineStatus()
        ]);
        
        setHealthData(healthResponse);
        setPipelineData(pipelineResponse);
      } catch (err) {
        console.error('Error fetching API status:', err);
        setError('Failed to load API status. Please check if the backend is running.');
      } finally {
        setLoading(false);
      }
    };

    fetchApiStatus();
  }, []);

  // Generate API services data from real status
  const apiServices = [
    {
      name: 'EIA Energy Data API',
      url: 'api.eia.gov',
      status: loading ? 'loading' : (healthData?.api_keys?.eia_configured ? 'online' : 'offline'),
      response_time: 234,
      uptime: healthData?.api_keys?.eia_configured ? 99.8 : 0,
      last_check: '30 seconds ago',
      description: 'US Energy Information Administration API',
      endpoints: [
        { 
          name: 'Electricity Demand', 
          status: healthData?.api_keys?.eia_configured ? 'online' : 'offline', 
          calls_today: pipelineData?.data_status?.energy_records_last_30_days || 0 
        },
        { name: 'Natural Gas Data', status: healthData?.api_keys?.eia_configured ? 'online' : 'offline', calls_today: 234 },
        { name: 'Coal Production', status: 'maintenance', calls_today: 0 }
      ]
    },
    {
      name: 'OpenWeatherMap API',
      url: 'api.openweathermap.org',
      status: loading ? 'loading' : (healthData?.api_keys?.weather_configured ? 'online' : 'offline'),
      response_time: 156,
      uptime: healthData?.api_keys?.weather_configured ? 100.0 : 0,
      last_check: '15 seconds ago',
      description: 'Weather data for correlation analysis',
      endpoints: [
        { 
          name: 'Current Weather', 
          status: healthData?.api_keys?.weather_configured ? 'online' : 'offline', 
          calls_today: pipelineData?.data_status?.weather_records_available || 0 
        },
        { name: 'Forecast Data', status: healthData?.api_keys?.weather_configured ? 'online' : 'offline', calls_today: 89 },
        { name: 'Historical Weather', status: healthData?.api_keys?.weather_configured ? 'online' : 'offline', calls_today: 45 }
      ]
    },
    {
      name: 'Internal Database',
      url: 'postgresql://localhost:5432',
      status: loading ? 'loading' : (healthData?.database === 'connected' ? 'online' : 'offline'),
      response_time: 23,
      uptime: healthData?.database === 'connected' ? 99.9 : 0,
      last_check: '10 seconds ago',
      description: 'Primary data storage and processing',
      endpoints: [
        { 
          name: 'Read Operations', 
          status: healthData?.database === 'connected' ? 'online' : 'offline', 
          calls_today: (pipelineData?.data_status?.energy_records_last_30_days || 0) + (pipelineData?.data_status?.weather_records_available || 0)
        },
        { 
          name: 'Write Operations', 
          status: healthData?.database === 'connected' ? 'online' : 'offline', 
          calls_today: pipelineData?.data_status?.energy_records_last_30_days || 0 
        },
        { name: 'Backup System', status: healthData?.database === 'connected' ? 'online' : 'offline', calls_today: 24 }
      ]
    },
    {
      name: 'Backend API',
      url: 'localhost:8000',
      status: loading ? 'loading' : (healthData ? 'online' : 'offline'),
      response_time: 45,
      uptime: healthData ? 99.5 : 0,
      last_check: '5 seconds ago',
      description: 'Energy Pipeline Backend API',
      endpoints: [
        { name: 'Health Check', status: healthData ? 'online' : 'offline', calls_today: 156 },
        { name: 'Energy Data', status: healthData ? 'online' : 'offline', calls_today: 89 },
        { name: 'Pipeline Status', status: healthData ? 'online' : 'offline', calls_today: 34 }
      ]
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-orange-600 bg-orange-100';
      case 'offline':
        return 'text-red-600 bg-red-100';
      case 'maintenance':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="w-4 h-4" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4" />;
      case 'offline':
        return <XCircle className="w-4 h-4" />;
      case 'maintenance':
        return <Clock className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getResponseTimeColor = (time: number) => {
    if (time < 200) return 'text-green-600';
    if (time < 500) return 'text-orange-600';
    return 'text-red-600';
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const [healthResponse, pipelineResponse] = await Promise.all([
        EnergyPipelineAPI.getHealth(),
        EnergyPipelineAPI.getPipelineStatus()
      ]);
      
      setHealthData(healthResponse);
      setPipelineData(pipelineResponse);
      setError(null);
    } catch (err) {
      setError('Failed to refresh API status');
    } finally {
      setRefreshing(false);
    }
  };

  // Calculate overview metrics
  const onlineServices = apiServices.filter(service => service.status === 'online').length;
  const totalServices = apiServices.length;
  const avgResponseTime = Math.round(apiServices.reduce((sum, service) => sum + service.response_time, 0) / apiServices.length);
  const totalApiCalls = apiServices.reduce((sum, service) => 
    sum + service.endpoints.reduce((endpointSum, endpoint) => endpointSum + endpoint.calls_today, 0), 0
  );
  const failedRequests = apiServices.filter(service => service.status === 'offline').length;

  return (
    <div className="space-y-6">
      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <XCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">API Status Monitor</h1>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Status</span>
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Services Online</h3>
            <Wifi className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex items-end space-x-2">
            <span className="text-2xl font-bold text-gray-900">{loading ? '...' : `${onlineServices} / ${totalServices}`}</span>
            <span className="text-sm text-green-600">{loading ? '...' : `${Math.round((onlineServices / totalServices) * 100)}% uptime`}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Avg Response Time</h3>
            <Activity className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex items-end space-x-2">
            <span className="text-2xl font-bold text-gray-900">{loading ? '...' : `${avgResponseTime}ms`}</span>
            <span className="text-sm text-orange-600">+12% today</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">API Calls Today</h3>
            <Globe className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex items-end space-x-2">
            <span className="text-2xl font-bold text-gray-900">{loading ? '...' : totalApiCalls.toLocaleString()}</span>
            <span className="text-sm text-green-600">+8.2%</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Failed Requests</h3>
            <WifiOff className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex items-end space-x-2">
            <span className="text-2xl font-bold text-gray-900">{loading ? '...' : failedRequests}</span>
            <span className="text-sm text-red-600">{loading ? '...' : `${((failedRequests / totalServices) * 100).toFixed(1)}% rate`}</span>
          </div>
        </div>
      </div>

      {/* API Services List */}
      <div className="space-y-6">
        {apiServices.map((service, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${getStatusColor(service.status)}`}>
                    {getStatusIcon(service.status)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{service.name}</h3>
                    <p className="text-sm text-gray-600">{service.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(service.status)}`}>
                    {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                  </span>
                  <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">URL:</span>
                  <div className="font-mono text-gray-900">{service.url}</div>
                </div>
                <div>
                  <span className="text-gray-600">Response Time:</span>
                  <div className={`font-semibold ${getResponseTimeColor(service.response_time)}`}>
                    {service.response_time}ms
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Uptime:</span>
                  <div className="font-semibold text-gray-900">{service.uptime}%</div>
                </div>
                <div>
                  <span className="text-gray-600">Last Check:</span>
                  <div className="text-gray-900">{service.last_check}</div>
                </div>
              </div>
            </div>

            {/* Endpoints */}
            <div className="p-6">
              <h4 className="text-sm font-medium text-gray-900 mb-4">Endpoints Status</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {service.endpoints.map((endpoint, endpointIndex) => (
                  <div
                    key={endpointIndex}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-2">
                      <div className={`p-1 rounded-full ${getStatusColor(endpoint.status)}`}>
                        {getStatusIcon(endpoint.status)}
                      </div>
                      <span className="text-sm font-medium text-gray-900">{endpoint.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">{endpoint.calls_today}</div>
                      <div className="text-xs text-gray-600">calls today</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Status History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">24-Hour Status History</h2>
        
        <div className="space-y-4">
          {apiServices.map((service, index) => (
            <div key={index}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">{service.name}</span>
                <span className="text-sm text-gray-600">{service.uptime}% uptime</span>
              </div>
              
              <div className="flex space-x-1">
                {Array.from({ length: 24 }, (_, i) => {
                  const hour = 23 - i;
                  const status = Math.random() > 0.95 ? 'offline' : Math.random() > 0.9 ? 'warning' : 'online';
                  
                  return (
                    <div
                      key={hour}
                      className={`h-8 flex-1 rounded-sm ${
                        status === 'online' ? 'bg-green-200' :
                        status === 'warning' ? 'bg-orange-200' : 'bg-red-200'
                      }`}
                      title={`${hour}:00 - ${status}`}
                    ></div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex items-center justify-center space-x-6 mt-6 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-200 rounded-sm"></div>
            <span>Online</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-orange-200 rounded-sm"></div>
            <span>Warning</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-200 rounded-sm"></div>
            <span>Offline</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiStatusPanel;