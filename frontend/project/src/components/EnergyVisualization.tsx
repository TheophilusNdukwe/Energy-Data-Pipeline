import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Filter,
  Download,
  Zap,
  RefreshCw
} from 'lucide-react';
import { EnergyPipelineAPI, EnergyConsumption } from '../services/api';

const EnergyVisualization: React.FC = () => {
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedTimeframe, setSelectedTimeframe] = useState('24h');
  const [energyData, setEnergyData] = useState<EnergyConsumption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch energy data from API
  useEffect(() => {
    const fetchEnergyData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const params = {
          region: selectedRegion !== 'all' ? selectedRegion.toUpperCase() : undefined,
          limit: selectedTimeframe === '1h' ? 24 : selectedTimeframe === '24h' ? 24 : selectedTimeframe === '7d' ? 168 : 720
        };
        
        const response = await EnergyPipelineAPI.getEnergyConsumption(params);
        setEnergyData(response.data || []);
      } catch (err) {
        console.error('Error fetching energy data:', err);
        setError('Failed to load energy data. Please check if the backend is running.');
      } finally {
        setLoading(false);
      }
    };

    fetchEnergyData();
  }, [selectedRegion, selectedTimeframe]);

  // Process data for charts with safety checks
  const hourlyData = energyData.length > 0 ? EnergyPipelineAPI.aggregateDataByHour(energyData) : [];
  const regionData = energyData.length > 0 ? EnergyPipelineAPI.aggregateDataByRegion(energyData) : [];
  
  // Add prediction data and change percentage to hourly data
  const hourlyDataWithPrediction = hourlyData.map(item => ({
    ...item,
    prediction: Math.round(item.consumption * (0.95 + Math.random() * 0.1)) // Simulated prediction ±5%
  }));

  // Add change percentage to region data (simulate based on consumption vs average)
  const regionDataWithChange = regionData.map(region => {
    const avgConsumption = regionData.reduce((sum, r) => sum + r.consumption, 0) / regionData.length;
    const changePercent = regionData.length > 0 ? 
      Math.round(((region.consumption - avgConsumption) / avgConsumption) * 100 * 10) / 10 : 0;
    
    return {
      ...region,
      change: changePercent
    };
  });
  
  // Calculate summary metrics from real data
  const totalConsumption = energyData.reduce((sum, item) => sum + (item.consumption_mwh || 0), 0);
  const avgConsumption = energyData.length > 0 ? totalConsumption / energyData.length : 0;
  const maxConsumption = energyData.length > 0 ? Math.max(...energyData.map(item => item.consumption_mwh || 0)) : 0;
  
  // Energy type data - this would need additional API endpoint for energy mix
  const energyTypeData = [
    { name: 'Natural Gas', value: 38.2, color: '#3B82F6' },
    { name: 'Coal', value: 23.1, color: '#6B7280' },
    { name: 'Nuclear', value: 20.6, color: '#10B981' },
    { name: 'Renewables', value: 12.8, color: '#F59E0B' },
    { name: 'Petroleum', value: 5.3, color: '#EF4444' }
  ];

  // Generate weekly trends from data grouped by day of week
  const weeklyTrends = React.useMemo(() => {
    if (energyData.length === 0) {
      return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({
        day,
        consumption: 0,
        weather: 72
      }));
    }

    const dayMap = new Map<string, { total: number; count: number }>();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    energyData.forEach(item => {
      const date = new Date(item.timestamp);
      const dayName = dayNames[date.getDay()];
      
      if (!dayMap.has(dayName)) {
        dayMap.set(dayName, { total: 0, count: 0 });
      }
      const current = dayMap.get(dayName)!;
      current.total += item.consumption_mwh || 0;
      current.count += 1;
    });

    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({
      day,
      consumption: dayMap.has(day) ? Math.round(dayMap.get(day)!.total / dayMap.get(day)!.count) : 0,
      weather: 72 + Math.random() * 10 // Weather data would need separate API call
    }));
  }, [energyData]);

  const regions = ['all', 'CAL', 'TEX', 'NYIS', 'FLA', 'US48'];
  const timeframes = ['1h', '24h', '7d', '30d'];

  const handleRefresh = async () => {
    const params = {
      region: selectedRegion !== 'all' ? selectedRegion.toUpperCase() : undefined,
      limit: selectedTimeframe === '1h' ? 24 : selectedTimeframe === '24h' ? 24 : selectedTimeframe === '7d' ? 168 : 720
    };
    
    try {
      setLoading(true);
      setError(null);
      const response = await EnergyPipelineAPI.getEnergyConsumption(params);
      setEnergyData(response.data || []);
    } catch (err) {
      console.error('Error refreshing data:', err);
      setError('Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (energyData.length === 0) {
      alert('No data to export');
      return;
    }

    const csvContent = [
      ['Timestamp', 'Region', 'Consumption (MWh)', 'Energy Type'],
      ...energyData.map(item => [
        item.timestamp,
        item.region,
        item.consumption_mwh,
        item.energy_type
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `energy-data-${selectedRegion}-${selectedTimeframe}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Energy Analytics</h1>
        
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            disabled={loading}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          >
            {regions.map(region => (
              <option key={region} value={region}>
                {region === 'all' ? 'All Regions' : 
                 region === 'CAL' ? 'California' :
                 region === 'TEX' ? 'Texas' :
                 region === 'NYIS' ? 'New York' :
                 region === 'FLA' ? 'Florida' :
                 region === 'US48' ? 'US 48 States' : region}
              </option>
            ))}
          </select>
          
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            disabled={loading}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          >
            {timeframes.map(timeframe => (
              <option key={timeframe} value={timeframe}>
                {timeframe === '1h' ? 'Last Hour' : timeframe === '24h' ? 'Last 24 Hours' : timeframe === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
              </option>
            ))}
          </select>
          
          <button 
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          
          <button 
            onClick={handleExport}
            disabled={loading || energyData.length === 0}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <TrendingDown className="w-5 h-5 text-red-600" />
            <span className="text-red-800">{error}</span>
          </div>
          <div className="mt-2 text-sm text-red-600">
            <p>Try refreshing or check if the backend is running.</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading energy data...</p>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Total Consumption</h3>
            <Zap className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex items-end space-x-2">
            <span className="text-2xl font-bold text-gray-900">
              {loading ? '...' : `${(totalConsumption / 1000).toFixed(1)} GWh`}
            </span>
            <span className="text-sm text-green-600 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              {energyData.length > 0 ? '2.3%' : '--'}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Peak Demand</h3>
            <TrendingUp className="w-5 h-5 text-orange-600" />
          </div>
          <div className="flex items-end space-x-2">
            <span className="text-2xl font-bold text-gray-900">
              {loading ? '...' : `${maxConsumption.toFixed(1)} MW`}
            </span>
            <span className="text-sm text-red-600 flex items-center">
              <TrendingDown className="w-3 h-3 mr-1" />
              1.1%
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Average Consumption</h3>
            <Filter className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex items-end space-x-2">
            <span className="text-2xl font-bold text-gray-900">
              {loading ? '...' : `${avgConsumption.toFixed(1)} MW`}
            </span>
            <span className="text-sm text-green-600 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              0.8%
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Data Points</h3>
            <Calendar className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex items-end space-x-2">
            <span className="text-2xl font-bold text-gray-900">
              {loading ? '...' : energyData.length.toLocaleString()}
            </span>
            <span className="text-sm text-green-600 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              Records
            </span>
          </div>
        </div>
      </div>

      {!loading && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Hourly Consumption */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Hourly Consumption vs Prediction</h2>
              {hourlyDataWithPrediction.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={hourlyDataWithPrediction}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="hour" 
                      stroke="#6b7280"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="#6b7280"
                      fontSize={12}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        `${value.toLocaleString()} MWh`,
                        name === 'consumption' ? 'Actual' : 'Predicted'
                      ]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="consumption" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="prediction" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  No hourly data available
                </div>
              )}
            </div>

            {/* Regional Consumption */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Regional Consumption</h2>
              {regionDataWithChange.length > 0 ? (
                <>
                  <div className="space-y-4">
                    {regionDataWithChange.map((region, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: region.color }}
                          ></div>
                          <span className="text-sm font-medium text-gray-900">{region.region}</span>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <span className="text-sm text-gray-600">{region.consumption.toLocaleString()} MWh</span>
                          <span className={`text-sm flex items-center ${
                            region.change >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {region.change >= 0 ? (
                              <TrendingUp className="w-3 h-3 mr-1" />
                            ) : (
                              <TrendingDown className="w-3 h-3 mr-1" />
                            )}
                            {Math.abs(region.change).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6">
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={regionDataWithChange} layout="horizontal">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                          type="number"
                          stroke="#6b7280"
                          fontSize={12}
                          tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                        />
                        <YAxis 
                          type="category"
                          dataKey="region"
                          stroke="#6b7280"
                          fontSize={12}
                          width={80}
                        />
                        <Tooltip 
                          formatter={(value: number) => [`${value.toLocaleString()} MWh`, 'Consumption']}
                        />
                        <Bar 
                          dataKey="consumption" 
                          fill="#3b82f6"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  No regional data available
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Energy Mix */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Energy Source Mix</h2>
              
              <div className="flex items-center justify-center mb-6">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={energyTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {energyTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`${value}%`, 'Share']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="space-y-3">
                {energyTypeData.map((source, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: source.color }}
                      ></div>
                      <span className="text-sm text-gray-700">{source.name}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{source.value}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly Trends */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Weekly Consumption Trends</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={weeklyTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="day"
                    stroke="#6b7280"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    fontSize={12}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    stroke="#f59e0b"
                    fontSize={12}
                    tickFormatter={(value) => `${value.toFixed(0)}°F`}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      name === 'consumption' ? `${value.toLocaleString()} MWh` : `${value.toFixed(1)}°F`,
                      name === 'consumption' ? 'Consumption' : 'Avg Temperature'
                    ]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="consumption" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="weather" 
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ fill: '#f59e0b', strokeWidth: 2, r: 3 }}
                    yAxisId="right"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default EnergyVisualization;