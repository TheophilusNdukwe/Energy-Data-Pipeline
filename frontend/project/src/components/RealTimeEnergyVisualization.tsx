// frontend/project/src/components/RealTimeEnergyVisualization.tsx
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from 'recharts';
import { useEnergyWebSocket, WebSocketMessage } from '../hooks/useWebSocket';

interface EnergyRecord {
  id: number;
  region: string;
  timestamp: string;
  consumption_mwh: number;
  energy_type: string;
  data_source: string;
  created_at: string;
}

interface ChartDataPoint {
  timestamp: string;
  time: string;
  date: string;
  [key: string]: string | number; // Dynamic region data
}

const RealTimeEnergyVisualization: React.FC = () => {
  const [energyData, setEnergyData] = useState<EnergyRecord[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>(['US48', 'CAL']);
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('line');
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('24h');
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [newDataCount, setNewDataCount] = useState(0);

  const { isConnected, lastMessage } = useEnergyWebSocket((message: WebSocketMessage) => {
    if (message.type === 'energy_data') {
      handleRealTimeEnergyData(message);
    }
  });

  const handleRealTimeEnergyData = (message: WebSocketMessage) => {
    const data = message.data;
    
    if (data.event === 'new_data_ingested') {
      setLastUpdate(new Date().toLocaleTimeString());
      setNewDataCount(prev => prev + (data.records_created || 0));
      
      // If in live mode, refresh the data
      if (isLiveMode) {
        fetchEnergyData();
      }
    }
  };

  const fetchEnergyData = async () => {
    try {
      const params = new URLSearchParams({
        limit: '1000',
        start_date: getStartDate().toISOString(),
        end_date: new Date().toISOString()
      });

      if (selectedRegions.length > 0) {
        selectedRegions.forEach(region => {
          params.append('region', region);
        });
      }

      const response = await fetch(`/api/v1/energy/consumption?${params}`);
      if (!response.ok) throw new Error('Failed to fetch energy data');
      
      const result = await response.json();
      setEnergyData(result.data || []);
    } catch (error) {
      console.error('Error fetching energy data:', error);
    }
  };

  const getStartDate = () => {
    const now = new Date();
    switch (timeRange) {
      case '1h': return new Date(now.getTime() - 1 * 60 * 60 * 1000);
      case '6h': return new Date(now.getTime() - 6 * 60 * 60 * 1000);
      case '24h': return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      default: return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  };

  useEffect(() => {
    fetchEnergyData();
  }, [selectedRegions, timeRange]);

  useEffect(() => {
    // Process energy data into chart format
    const processedData = processDataForChart(energyData);
    setChartData(processedData);
  }, [energyData, selectedRegions]);

  const processDataForChart = (data: EnergyRecord[]): ChartDataPoint[] => {
    if (!data.length) return [];

    // Group data by timestamp
    const groupedData = data.reduce((acc, record) => {
      const timestamp = new Date(record.timestamp).toISOString();
      
      if (!acc[timestamp]) {
        acc[timestamp] = {
          timestamp,
          time: new Date(record.timestamp).toLocaleTimeString(),
          date: new Date(record.timestamp).toLocaleDateString()
        };
      }
      
      if (selectedRegions.includes(record.region)) {
        acc[timestamp][record.region] = record.consumption_mwh;
      }
      
      return acc;
    }, {} as Record<string, any>);

    // Convert to array and sort by timestamp
    return Object.values(groupedData)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .slice(-200); // Keep last 200 data points for performance
  };

  const getRegionColor = (region: string) => {
    const colors = {
      'US48': '#3B82F6',
      'CAL': '#10B981',
      'NYIS': '#F59E0B',
      'ERCO': '#EF4444',
      'NE': '#8B5CF6',
      'MISO': '#F97316'
    };
    return colors[region as keyof typeof colors] || '#6B7280';
  };

  const availableRegions = ['US48', 'CAL', 'NYIS', 'ERCO', 'NE', 'MISO'];

  const formatYAxis = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{`Time: ${new Date(label).toLocaleString()}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {`${entry.dataKey}: ${entry.value?.toLocaleString()} MWh`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    const chartProps = {
      data: chartData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    switch (chartType) {
      case 'area':
        return (
          <AreaChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {selectedRegions.map(region => (
              <Area
                key={region}
                type="monotone"
                dataKey={region}
                stackId="1"
                stroke={getRegionColor(region)}
                fill={getRegionColor(region)}
                fillOpacity={0.6}
              />
            ))}
          </AreaChart>
        );
      
      case 'bar':
        return (
          <BarChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {selectedRegions.map(region => (
              <Bar
                key={region}
                dataKey={region}
                fill={getRegionColor(region)}
              />
            ))}
          </BarChart>
        );
      
      default:
        return (
          <LineChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {selectedRegions.map(region => (
              <Line
                key={region}
                type="monotone"
                dataKey={region}
                stroke={getRegionColor(region)}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Real-time Status */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">⚡ Real-Time Energy Consumption</h2>
        <div className="flex items-center space-x-4">
          {/* Live Mode Toggle */}
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={isLiveMode}
              onChange={(e) => setIsLiveMode(e.target.checked)}
              className="form-checkbox h-4 w-4 text-blue-600"
            />
            <span className="ml-2 text-sm text-gray-700">Live Mode</span>
          </label>
          
          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">
              {isConnected ? 'Live Updates' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* Real-time Stats */}
      {(lastUpdate || newDataCount > 0) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-blue-600">📡</span>
                <span className="text-sm font-medium text-blue-800">Real-time Updates</span>
              </div>
              {lastUpdate && (
                <span className="text-sm text-blue-600">Last update: {lastUpdate}</span>
              )}
              {newDataCount > 0 && (
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                  +{newDataCount} new records
                </span>
              )}
            </div>
            {newDataCount > 0 && (
              <button
                onClick={() => setNewDataCount(0)}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Region Selection */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Regions</h3>
          <div className="space-y-2">
            {availableRegions.map(region => (
              <label key={region} className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedRegions.includes(region)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRegions([...selectedRegions, region]);
                    } else {
                      setSelectedRegions(selectedRegions.filter(r => r !== region));
                    }
                  }}
                  className="form-checkbox h-4 w-4 text-blue-600"
                />
                <span className="ml-2 text-sm text-gray-700">{region}</span>
                <div 
                  className="ml-auto w-4 h-4 rounded"
                  style={{ backgroundColor: getRegionColor(region) }}
                ></div>
              </label>
            ))}
          </div>
        </div>

        {/* Chart Type */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Chart Type</h3>
          <div className="space-y-2">
            {[
              { value: 'line', label: 'Line Chart', icon: '📈' },
              { value: 'area', label: 'Area Chart', icon: '📊' },
              { value: 'bar', label: 'Bar Chart', icon: '📉' }
            ].map(({ value, label, icon }) => (
              <label key={value} className="flex items-center">
                <input
                  type="radio"
                  value={value}
                  checked={chartType === value}
                  onChange={(e) => setChartType(e.target.value as any)}
                  className="form-radio h-4 w-4 text-blue-600"
                />
                <span className="ml-2 text-sm text-gray-700">{icon} {label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Time Range */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Time Range</h3>
          <div className="space-y-2">
            {[
              { value: '1h', label: 'Last Hour' },
              { value: '6h', label: 'Last 6 Hours' },
              { value: '24h', label: 'Last 24 Hours' },
              { value: '7d', label: 'Last 7 Days' }
            ].map(({ value, label }) => (
              <label key={value} className="flex items-center">
                <input
                  type="radio"
                  value={value}
                  checked={timeRange === value}
                  onChange={(e) => setTimeRange(e.target.value as any)}
                  className="form-radio h-4 w-4 text-blue-600"
                />
                <span className="ml-2 text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Energy Consumption ({selectedRegions.join(', ')})
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchEnergyData}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
            >
              Refresh
            </button>
            <span className="text-sm text-gray-500">
              {chartData.length} data points
            </span>
          </div>
        </div>
        
        {chartData.length > 0 ? (
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-96 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
              <p className="text-gray-600 mb-4">
                {selectedRegions.length === 0 
                  ? 'Select at least one region to view data'
                  : 'Run the energy pipeline to populate data'
                }
              </p>
              {selectedRegions.length > 0 && (
                <button
                  onClick={fetchEnergyData}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Try Fetching Data
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {selectedRegions.map(region => {
            const regionData = chartData
              .map(d => d[region] as number)
              .filter(v => v !== undefined && v !== null);
            
            if (regionData.length === 0) return null;
            
            const avg = regionData.reduce((a, b) => a + b, 0) / regionData.length;
            const max = Math.max(...regionData);
            const min = Math.min(...regionData);
            
            return (
              <div key={region} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <div 
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: getRegionColor(region) }}
                  ></div>
                  <h4 className="font-semibold text-gray-900">{region}</h4>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Average:</span>
                    <span className="font-medium">{avg.toLocaleString(undefined, { maximumFractionDigits: 1 })} MWh</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Peak:</span>
                    <span className="font-medium">{max.toLocaleString()} MWh</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Minimum:</span>
                    <span className="font-medium">{min.toLocaleString()} MWh</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RealTimeEnergyVisualization;
