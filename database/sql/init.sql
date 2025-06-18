-- init.sql - Initialize energy pipeline database
-- Run this if you need to manually set up the database

-- Create database (if running outside Docker)
-- CREATE DATABASE energy_pipeline;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Useful indexes for performance
CREATE INDEX IF NOT EXISTS idx_energy_consumption_timestamp_region 
ON energy_consumption(timestamp DESC, region);

CREATE INDEX IF NOT EXISTS idx_weather_data_timestamp_region 
ON weather_data(timestamp DESC, region);

CREATE INDEX IF NOT EXISTS idx_quality_metrics_calculated_at 
ON data_quality_metrics(calculated_at DESC);

CREATE INDEX IF NOT EXISTS idx_quality_issues_detected_at_status 
ON data_quality_issues(detected_at DESC, status);

-- Views for common queries
CREATE OR REPLACE VIEW recent_energy_data AS
SELECT 
    region,
    timestamp,
    consumption_mwh,
    energy_type,
    data_source,
    created_at
FROM energy_consumption 
WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY timestamp DESC;

CREATE OR REPLACE VIEW quality_summary AS
SELECT 
    table_name,
    metric_name,
    metric_value,
    calculated_at,
    ROW_NUMBER() OVER (PARTITION BY table_name, metric_name ORDER BY calculated_at DESC) as rn
FROM data_quality_metrics;

CREATE OR REPLACE VIEW latest_quality_scores AS
SELECT 
    table_name,
    metric_name,
    metric_value,
    calculated_at
FROM quality_summary 
WHERE rn = 1;

-- Grant permissions (adjust as needed)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;