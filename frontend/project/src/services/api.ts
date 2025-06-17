// src/services/api.ts - API service layer for connecting to FastAPI backend
import axios from 'axios';

// Use relative URLs to work with Vite proxy configuration
// Vite proxy will forward /api and /health requests to http://localhost:8000
const API_BASE_URL = '';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request/Response interfaces
export interface EnergyConsumption {
  id: number;
  region: string;
  timestamp: string;
  consumption_mwh: number;
  energy_type: string;
  data_source: string;
  created_at: string;
}

export interface WeatherData {
  id: number;
  region: string;
  timestamp: string;
  temperature: number;
  humidity: number;
  wind_speed: number;
  pressure: number;
  created_at: string;
}

export interface HealthStatus {
  status: string;
  database: string;
  timestamp: string;
  api_keys: {
    eia_configured: boolean;
    weather_configured: boolean;
  };
}

export interface PipelineStatus {
  status: string;
  data_status: {
    energy_records_last_30_days: number;
    weather_records_available: number;
    last_updated: string;
  };
  api_keys: {
    eia_configured: boolean;
    weather_configured: boolean;
  };
}

export interface EnergyConsumptionSummary {
  total_records: number;
  avg_consumption: number;
  total_consumption: number;
  min_consumption: number;
  max_consumption: number;
  period_days: number;
}

// API Service Class
export class EnergyPipelineAPI {
  // Health and Status
  static async getHealth(): Promise<HealthStatus> {
    const response = await api.get('/health');
    return response.data;
  }

  static async getPipelineStatus(): Promise<PipelineStatus> {
    const response = await api.get('/api/v1/status');
    return response.data;
  }

  // Energy Data
  static async getEnergyConsumption(params: {
    region?: string;
    energy_type?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
  } = {}): Promise<{ status: string; count: number; data: EnergyConsumption[] }> {
    const response = await api.get('/api/v1/energy/consumption', { params });
    return response.data;
  }

  static async getEnergyConsumptionSummary(params: {
    region?: string;
    days_back?: number;
  } = {}): Promise<{ status: string; summary: EnergyConsumptionSummary }> {
    const response = await api.get('/api/v1/energy/summary', { params });
    return response.data;
  }

  // Weather Data
  static async getCurrentWeather(region?: string): Promise<{ status: string; count: number; data: WeatherData[] }> {
    const params = region ? { region } : {};
    const response = await api.get('/api/v1/weather/current', { params });
    return response.data;
  }

  // Pipeline Operations
  static async runEnergyIngestion(params: {
    regions?: string[];
    days_back?: number;
  } = {}): Promise<any> {
    const queryParams = new URLSearchParams();
    
    if (params.regions) {
      params.regions.forEach(region => queryParams.append('regions', region));
    }
    if (params.days_back) {
      queryParams.set('days_back', params.days_back.toString());
    }

    const response = await api.post(`/api/v1/pipeline/run-energy-ingestion?${queryParams}`);
    return response.data;
  }

  static async runWeatherIngestion(params: {
    cities?: string[];
  } = {}): Promise<any> {
    const queryParams = new URLSearchParams();
    
    if (params.cities) {
      params.cities.forEach(city => queryParams.append('cities', city));
    }

    const response = await api.post(`/api/v1/pipeline/run-weather-ingestion?${queryParams}`);
    return response.data;
  }

  // NEW: Quality endpoints  
  static async getQualityDashboard(): Promise<any> {
    const response = await api.get('/api/v1/quality/dashboard');
    return response.data;
  }

  static async runQualityCheck(): Promise<any> {
    const response = await api.post('/api/v1/quality/run-check');
    return response.data;
  }

  static async getQualityMetrics(params: {
    table_name?: string;
    limit?: number;
  } = {}): Promise<any> {
    const response = await api.get('/api/v1/quality/metrics', { params });
    return response.data;
  }

  static async getQualityIssues(params: {
    table_name?: string;
    severity?: string;
    status?: string;
    limit?: number;
  } = {}): Promise<any> {
    const response = await api.get('/api/v1/quality/issues', { params });
    return response.data;
  }

  static async getQualitySummary(params: {
    days_back?: number;
  } = {}): Promise<any> {
    const response = await api.get('/api/v1/quality/summary', { params });
    return response.data;
  }

  static async resolveQualityIssue(issueId: number, resolutionNotes: string): Promise<any> {
    const response = await api.put(`/api/v1/quality/issues/${issueId}/resolve`, null, {
      params: { resolution_notes: resolutionNotes }
    });
    return response.data;
  }

  // NEW: Quality Monitoring Control
  static async getMonitoringStatus(): Promise<any> {
    const response = await api.get('/api/v1/quality/monitoring/status');
    return response.data;
  }

  static async startQualityMonitoring(): Promise<any> {
    const response = await api.post('/api/v1/quality/monitoring/start');
    return response.data;
  }

  static async stopQualityMonitoring(): Promise<any> {
    const response = await api.post('/api/v1/quality/monitoring/stop');
    return response.data;
  }

  static async runImmediateQualityCheck(): Promise<any> {
    const response = await api.post('/api/v1/quality/monitoring/immediate-check');
    return response.data;
  }
  static transformEnergyDataForCharts(data: EnergyConsumption[]) {
    return data.map(item => ({
      timestamp: new Date(item.timestamp).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      consumption: item.consumption_mwh,
      region: item.region,
      hour: new Date(item.timestamp).getHours()
    }));
  }

  static aggregateDataByRegion(data: EnergyConsumption[]) {
    const regionMap = new Map<string, { consumption: number; count: number }>();
    
    data.forEach(item => {
      if (!regionMap.has(item.region)) {
        regionMap.set(item.region, { consumption: 0, count: 0 });
      }
      const current = regionMap.get(item.region)!;
      current.consumption += item.consumption_mwh;
      current.count += 1;
    });

    return Array.from(regionMap.entries()).map(([region, data]) => ({
      region,
      consumption: Math.round(data.consumption),
      avgConsumption: Math.round(data.consumption / data.count),
      color: EnergyPipelineAPI.getRegionColor(region)
    }));
  }

  static aggregateDataByHour(data: EnergyConsumption[]) {
    const hourMap = new Map<number, { consumption: number; count: number }>();
    
    data.forEach(item => {
      const hour = new Date(item.timestamp).getHours();
      if (!hourMap.has(hour)) {
        hourMap.set(hour, { consumption: 0, count: 0 });
      }
      const current = hourMap.get(hour)!;
      current.consumption += item.consumption_mwh;
      current.count += 1;
    });

    return Array.from(hourMap.entries())
      .map(([hour, data]) => ({
        hour: `${hour.toString().padStart(2, '0')}:00`,
        consumption: Math.round(data.consumption / data.count), // Average for that hour
        totalConsumption: Math.round(data.consumption)
      }))
      .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));
  }

  private static getRegionColor(region: string): string {
    const colors = {
      'CAL': '#3B82F6', // Blue
      'CALIFORNIA': '#3B82F6',
      'NYIS': '#10B981', // Green  
      'NEW YORK': '#10B981',
      'TEX': '#F59E0B', // Orange
      'TEXAS': '#F59E0B',
      'FLA': '#EF4444', // Red
      'FLORIDA': '#EF4444',
      'US48': '#8B5CF6', // Purple
      'US': '#8B5CF6'
    };
    return colors[region.toUpperCase() as keyof typeof colors] || '#6B7280'; // Default gray
  }
}

// Error handling interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    
    if (error.response?.status === 500) {
      console.error('Server Error - Check if your backend is running on http://localhost:8000');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('Connection refused - Make sure your FastAPI backend is running');
    }
    
    return Promise.reject(error);
  }
);

export default api;
