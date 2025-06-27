// frontend/project/src/components/RealTimePipelineMonitor.tsx
import React, { useState, useEffect } from 'react';
import { usePipelineWebSocket, WebSocketMessage } from '../hooks/useWebSocket';

interface PipelineStatus {
  pipeline: string;
  status: 'started' | 'fetching' | 'validating' | 'saving' | 'quality_check' | 'completed' | 'failed';
  message?: string;
  progress?: number;
  start_time?: string;
  end_time?: string;
  duration_seconds?: number;
  error?: string;
  result?: any;
  regions?: string[];
  cities?: string[];
}

interface PipelineRun {
  id: string;
  pipeline: string;
  status: PipelineStatus;
  timestamp: string;
  duration?: number;
}

const RealTimePipelineMonitor: React.FC = () => {
  const [activePipelines, setActivePipelines] = useState<Map<string, PipelineRun>>(new Map());
  const [completedRuns, setCompletedRuns] = useState<PipelineRun[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>(['US48', 'CAL']);
  const [selectedCities, setSelectedCities] = useState<string[]>(['Boston', 'New York']);
  const [daysBack, setDaysBack] = useState(7);

  const { isConnected, lastMessage } = usePipelineWebSocket((message: WebSocketMessage) => {
    if (message.type === 'pipeline_status') {
      handlePipelineUpdate(message);
    }
  });

  const handlePipelineUpdate = (message: WebSocketMessage) => {
    const statusData = message.data as PipelineStatus;
    const runId = `${statusData.pipeline}_${statusData.start_time || Date.now()}`;

    const pipelineRun: PipelineRun = {
      id: runId,
      pipeline: statusData.pipeline,
      status: statusData,
      timestamp: message.timestamp,
      duration: statusData.duration_seconds
    };

    if (statusData.status === 'completed' || statusData.status === 'failed') {
      // Move to completed runs
      setActivePipelines(prev => {
        const newMap = new Map(prev);
        newMap.delete(runId);
        return newMap;
      });

      setCompletedRuns(prev => [pipelineRun, ...prev].slice(0, 20)); // Keep last 20 runs
    } else {
      // Update active pipelines
      setActivePipelines(prev => new Map(prev.set(runId, pipelineRun)));
    }
  };

  const startEnergyPipeline = async () => {
    try {
      const params = new URLSearchParams();
      selectedRegions.forEach(region => params.append('regions', region));
      params.append('days_back', daysBack.toString());

      const response = await fetch(`/api/v1/pipeline/run-energy-ingestion?${params}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Energy pipeline started:', result);
    } catch (error) {
      console.error('Failed to start energy pipeline:', error);
      alert('Failed to start energy pipeline. Check console for details.');
    }
  };

  const startWeatherPipeline = async () => {
    try {
      const params = new URLSearchParams();
      selectedCities.forEach(city => params.append('cities', city));

      const response = await fetch(`/api/v1/pipeline/run-weather-ingestion?${params}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Weather pipeline started:', result);
    } catch (error) {
      console.error('Failed to start weather pipeline:', error);
      alert('Failed to start weather pipeline. Check console for details.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'started': return 'bg-blue-100 text-blue-800';
      case 'fetching': return 'bg-yellow-100 text-yellow-800';
      case 'validating': return 'bg-purple-100 text-purple-800';
      case 'saving': return 'bg-indigo-100 text-indigo-800';
      case 'quality_check': return 'bg-cyan-100 text-cyan-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'started': return '🚀';
      case 'fetching': return '📡';
      case 'validating': return '🔍';
      case 'saving': return '💾';
      case 'quality_check': return '📊';
      case 'completed': return '✅';
      case 'failed': return '❌';
      default: return '⏳';
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toFixed(1)}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Real-Time Pipeline Monitor</h2>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-600">
            {isConnected ? 'Live Updates' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Pipeline Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Energy Pipeline Controls */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">⚡ Energy Data Pipeline</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Regions
              </label>
              <div className="space-y-2">
                {['US48', 'CAL', 'NYIS', 'ERCO'].map(region => (
                  <label key={region} className="inline-flex items-center mr-4">
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
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Days Back: {daysBack}
              </label>
              <input
                type="range"
                min="1"
                max="30"
                value={daysBack}
                onChange={(e) => setDaysBack(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <button
              onClick={startEnergyPipeline}
              disabled={selectedRegions.length === 0}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Start Energy Pipeline
            </button>
          </div>
        </div>

        {/* Weather Pipeline Controls */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🌤️ Weather Data Pipeline</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cities
              </label>
              <div className="space-y-2">
                {['Boston', 'New York', 'Los Angeles', 'Chicago', 'Miami', 'Seattle'].map(city => (
                  <label key={city} className="inline-flex items-center mr-4">
                    <input
                      type="checkbox"
                      checked={selectedCities.includes(city)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCities([...selectedCities, city]);
                        } else {
                          setSelectedCities(selectedCities.filter(c => c !== city));
                        }
                      }}
                      className="form-checkbox h-4 w-4 text-blue-600"
                    />
                    <span className="ml-2 text-sm text-gray-700">{city}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={startWeatherPipeline}
              disabled={selectedCities.length === 0}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Start Weather Pipeline
            </button>
          </div>
        </div>
      </div>

      {/* Active Pipelines */}
      {activePipelines.size > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🔄 Active Pipelines</h3>
          <div className="space-y-4">
            {Array.from(activePipelines.values()).map((run) => (
              <div key={run.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getStatusIcon(run.status.status)}</span>
                    <span className="font-medium">{run.pipeline.replace('_', ' ').toUpperCase()}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(run.status.status)}`}>
                      {run.status.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(run.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                {run.status.message && (
                  <div className="text-sm text-gray-600 mb-2">
                    {run.status.message}
                  </div>
                )}

                {run.status.progress !== undefined && (
                  <div className="mb-2">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>{run.status.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${run.status.progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {(run.status.regions || run.status.cities) && (
                  <div className="text-sm text-gray-500">
                    {run.status.regions && `Regions: ${run.status.regions.join(', ')}`}
                    {run.status.cities && `Cities: ${run.status.cities.join(', ')}`}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Pipeline Runs */}
      {completedRuns.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Recent Pipeline Runs</h3>
          <div className="space-y-3">
            {completedRuns.map((run) => (
              <div key={run.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{getStatusIcon(run.status.status)}</span>
                  <div>
                    <div className="font-medium text-gray-900">
                      {run.pipeline.replace('_', ' ').toUpperCase()}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(run.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  {run.duration && (
                    <span className="text-sm text-gray-600">
                      {formatDuration(run.duration)}
                    </span>
                  )}
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(run.status.status)}`}>
                    {run.status.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Activity Message */}
      {activePipelines.size === 0 && completedRuns.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="text-6xl mb-4">🏗️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Pipeline Activity</h3>
          <p className="text-gray-600 mb-6">
            Start a pipeline above to see real-time progress updates and monitoring.
          </p>
          <div className="text-sm text-gray-500">
            {isConnected ? (
              <span className="flex items-center justify-center space-x-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span>Ready to receive real-time updates</span>
              </span>
            ) : (
              <span className="text-red-600">WebSocket disconnected - Updates may be delayed</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RealTimePipelineMonitor;
