import React, { useState } from 'react';
import { 
  Settings, 
  Save, 
  RefreshCw, 
  Bell, 
  Database, 
  Globe,
  Clock,
  Shield,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff
} from 'lucide-react';

const ConfigurationPanel: React.FC = () => {
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    // API Configuration
    eia_api_key: '************************',
    openweather_api_key: '************************',
    alphavantage_api_key: '************************',
    
    // Database Configuration
    db_host: 'localhost',
    db_port: '5432',
    db_name: 'energy_pipeline',
    db_user: 'postgres',
    db_password: '************************',
    
    // Pipeline Settings
    ingestion_interval: '30',
    validation_threshold: '95',
    retry_attempts: '3',
    timeout_seconds: '60',
    
    // Notification Settings
    email_alerts: true,
    slack_notifications: false,
    webhook_url: '',
    alert_threshold: 'warning',
    
    // Data Retention
    retention_days: '90',
    backup_enabled: true,
    backup_frequency: 'daily',
    archive_old_data: true
  });

  const handleSave = async () => {
    setSaving(true);
    // Simulate save operation
    await new Promise(resolve => setTimeout(resolve, 2000));
    setSaving(false);
  };

  const handleInputChange = (key: string, value: string | boolean) => {
    setConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const configSections = [
    {
      title: 'API Configuration',
      icon: Globe,
      description: 'External API keys and connection settings',
      fields: [
        {
          key: 'eia_api_key',
          label: 'EIA API Key',
          type: 'password',
          description: 'Energy Information Administration API key'
        },
        {
          key: 'openweather_api_key',
          label: 'OpenWeather API Key',
          type: 'password',
          description: 'Weather data API key for correlation analysis'
        },
        {
          key: 'alphavantage_api_key',
          label: 'Alpha Vantage API Key',
          type: 'password',
          description: 'Economic indicators and market data'
        }
      ]
    },
    {
      title: 'Database Configuration',
      icon: Database,
      description: 'PostgreSQL database connection settings',
      fields: [
        {
          key: 'db_host',
          label: 'Database Host',
          type: 'text',
          description: 'PostgreSQL server hostname or IP address'
        },
        {
          key: 'db_port',
          label: 'Database Port',
          type: 'number',
          description: 'PostgreSQL server port (default: 5432)'
        },
        {
          key: 'db_name',
          label: 'Database Name',
          type: 'text',
          description: 'Name of the energy pipeline database'
        },
        {
          key: 'db_user',
          label: 'Database User',
          type: 'text',
          description: 'PostgreSQL username'
        },
        {
          key: 'db_password',
          label: 'Database Password',
          type: 'password',
          description: 'PostgreSQL user password'
        }
      ]
    },
    {
      title: 'Pipeline Settings',
      icon: Settings,
      description: 'Data processing and ingestion configuration',
      fields: [
        {
          key: 'ingestion_interval',
          label: 'Ingestion Interval (minutes)',
          type: 'number',
          description: 'How often to fetch new data from APIs'
        },
        {
          key: 'validation_threshold',
          label: 'Validation Threshold (%)',
          type: 'number',
          description: 'Minimum data quality score to accept'
        },
        {
          key: 'retry_attempts',
          label: 'Retry Attempts',
          type: 'number',
          description: 'Number of retries for failed operations'
        },
        {
          key: 'timeout_seconds',
          label: 'Timeout (seconds)',
          type: 'number',
          description: 'API request timeout duration'
        }
      ]
    },
    {
      title: 'Notifications',
      icon: Bell,
      description: 'Alert and notification preferences',
      fields: [
        {
          key: 'email_alerts',
          label: 'Email Alerts',
          type: 'boolean',
          description: 'Send email notifications for critical issues'
        },
        {
          key: 'slack_notifications',
          label: 'Slack Notifications',
          type: 'boolean',
          description: 'Send notifications to Slack channel'
        },
        {
          key: 'webhook_url',
          label: 'Webhook URL',
          type: 'url',
          description: 'Custom webhook endpoint for notifications'
        },
        {
          key: 'alert_threshold',
          label: 'Alert Threshold',
          type: 'select',
          options: ['info', 'warning', 'error'],
          description: 'Minimum severity level for alerts'
        }
      ]
    }
  ];

  const renderField = (field: any) => {
    const value = config[field.key as keyof typeof config];

    switch (field.type) {
      case 'boolean':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              id={field.key}
              checked={value as boolean}
              onChange={(e) => handleInputChange(field.key, e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <label htmlFor={field.key} className="ml-2 text-sm text-gray-900">
              {field.label}
            </label>
          </div>
        );

      case 'select':
        return (
          <div>
            <label htmlFor={field.key} className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
            </label>
            <select
              id={field.key}
              value={value as string}
              onChange={(e) => handleInputChange(field.key, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {field.options.map((option: string) => (
                <option key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
          </div>
        );

      case 'password':
        return (
          <div>
            <label htmlFor={field.key} className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
            </label>
            <div className="relative">
              <input
                type={showApiKeys ? 'text' : 'password'}
                id={field.key}
                value={value as string}
                onChange={(e) => handleInputChange(field.key, e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your API key"
              />
              <button
                type="button"
                onClick={() => setShowApiKeys(!showApiKeys)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showApiKeys ? (
                  <EyeOff className="w-4 h-4 text-gray-400" />
                ) : (
                  <Eye className="w-4 h-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>
        );

      default:
        return (
          <div>
            <label htmlFor={field.key} className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
            </label>
            <input
              type={field.type}
              id={field.key}
              value={value as string}
              onChange={(e) => handleInputChange(field.key, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Configuration</h1>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Configuration Status */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuration Status</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 text-green-600 rounded-lg">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">API Keys</p>
              <p className="text-xs text-gray-600">3/3 configured</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 text-green-600 rounded-lg">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Database</p>
              <p className="text-xs text-gray-600">Connected</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Notifications</p>
              <p className="text-xs text-gray-600">Partially configured</p>
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Sections */}
      <div className="space-y-6">
        {configSections.map((section, index) => {
          const Icon = section.icon;
          return (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
                    <p className="text-sm text-gray-600">{section.description}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {section.fields.map((field, fieldIndex) => (
                    <div key={fieldIndex} className="space-y-2">
                      {renderField(field)}
                      {field.description && (
                        <p className="text-xs text-gray-500">{field.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Data Retention Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Data Retention</h3>
            <p className="text-sm text-gray-600">Configure data storage and archival policies</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="retention_days" className="block text-sm font-medium text-gray-700 mb-1">
              Retention Period (days)
            </label>
            <input
              type="number"
              id="retention_days"
              value={config.retention_days}
              onChange={(e) => handleInputChange('retention_days', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">How long to keep raw data before archiving</p>
          </div>
          
          <div>
            <label htmlFor="backup_frequency" className="block text-sm font-medium text-gray-700 mb-1">
              Backup Frequency
            </label>
            <select
              id="backup_frequency"
              value={config.backup_frequency}
              onChange={(e) => handleInputChange('backup_frequency', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">How often to create database backups</p>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="backup_enabled"
              checked={config.backup_enabled}
              onChange={(e) => handleInputChange('backup_enabled', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <label htmlFor="backup_enabled" className="ml-2 text-sm text-gray-900">
              Enable Automatic Backups
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="archive_old_data"
              checked={config.archive_old_data}
              onChange={(e) => handleInputChange('archive_old_data', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <label htmlFor="archive_old_data" className="ml-2 text-sm text-gray-900">
              Archive Old Data
            </label>
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <Shield className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-yellow-800">Security Notice</h4>
            <p className="text-sm text-yellow-700 mt-1">
              API keys and passwords are encrypted at rest and in transit. Only users with administrator 
              privileges can view or modify these sensitive configuration values.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigurationPanel;