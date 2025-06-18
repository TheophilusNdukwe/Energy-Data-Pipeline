-- useful_queries.sql - Common queries for monitoring and debugging

-- =============================================================================
-- DATA QUALITY MONITORING QUERIES
-- =============================================================================

-- Check latest quality scores
SELECT 
    table_name,
    metric_name, 
    metric_value,
    calculated_at
FROM data_quality_metrics 
WHERE calculated_at >= CURRENT_DATE - INTERVAL '1 day'
ORDER BY calculated_at DESC;

-- View quality trends over time
SELECT 
    table_name,
    metric_name,
    DATE(calculated_at) as date,
    AVG(metric_value) as avg_score,
    MIN(metric_value) as min_score,
    MAX(metric_value) as max_score
FROM data_quality_metrics 
WHERE calculated_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY table_name, metric_name, DATE(calculated_at)
ORDER BY date DESC, table_name, metric_name;

-- Check open quality issues
SELECT 
    table_name,
    issue_type,
    severity,
    issue_description,
    detected_at
FROM data_quality_issues 
WHERE status = 'OPEN'
ORDER BY detected_at DESC;

-- =============================================================================
-- DATA PIPELINE MONITORING QUERIES  
-- =============================================================================

-- Energy data summary by region (last 30 days)
SELECT 
    region,
    COUNT(*) as record_count,
    MIN(timestamp) as earliest_record,
    MAX(timestamp) as latest_record,
    AVG(consumption_mwh) as avg_consumption,
    MAX(consumption_mwh) as max_consumption
FROM energy_consumption 
WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY region
ORDER BY record_count DESC;

-- Data freshness check
SELECT 
    'energy_consumption' as table_name,
    COUNT(*) as total_records,
    MAX(created_at) as last_insert,
    AGE(NOW(), MAX(created_at)) as time_since_last_insert
FROM energy_consumption
UNION ALL
SELECT 
    'weather_data' as table_name,
    COUNT(*) as total_records,
    MAX(created_at) as last_insert,
    AGE(NOW(), MAX(created_at)) as time_since_last_insert
FROM weather_data;

-- Check for data gaps (missing hourly data)
WITH hourly_series AS (
    SELECT generate_series(
        DATE_TRUNC('hour', CURRENT_DATE - INTERVAL '7 days'),
        DATE_TRUNC('hour', CURRENT_DATE),
        INTERVAL '1 hour'
    ) as hour
),
energy_hours AS (
    SELECT DISTINCT 
        region,
        DATE_TRUNC('hour', timestamp) as hour
    FROM energy_consumption 
    WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
)
SELECT 
    h.hour,
    COUNT(e.region) as regions_with_data,
    ARRAY_AGG(e.region ORDER BY e.region) as regions
FROM hourly_series h
LEFT JOIN energy_hours e ON h.hour = e.hour
GROUP BY h.hour
HAVING COUNT(e.region) < 3  -- Adjust based on expected number of regions
ORDER BY h.hour DESC;

-- =============================================================================
-- PERFORMANCE MONITORING QUERIES
-- =============================================================================

-- Table sizes
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats 
WHERE schemaname = 'public' 
  AND tablename IN ('energy_consumption', 'weather_data', 'data_quality_metrics')
ORDER BY tablename, attname;

-- Index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- =============================================================================
-- DATA VALIDATION QUERIES
-- =============================================================================

-- Find null or invalid energy consumption values
SELECT 
    region,
    timestamp,
    consumption_mwh,
    'null_consumption' as issue_type
FROM energy_consumption 
WHERE consumption_mwh IS NULL
   OR consumption_mwh < 0 
   OR consumption_mwh > 1000000
ORDER BY timestamp DESC
LIMIT 100;

-- Find duplicate records
SELECT 
    region,
    timestamp,
    energy_type,
    COUNT(*) as duplicate_count
FROM energy_consumption 
GROUP BY region, timestamp, energy_type
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Weather data validation
SELECT 
    region,
    timestamp,
    temperature,
    humidity,
    CASE 
        WHEN temperature IS NULL THEN 'null_temperature'
        WHEN temperature < -50 OR temperature > 150 THEN 'invalid_temperature_range'
        WHEN humidity IS NULL THEN 'null_humidity' 
        WHEN humidity < 0 OR humidity > 100 THEN 'invalid_humidity_range'
        ELSE 'valid'
    END as validation_status
FROM weather_data 
WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
  AND (temperature IS NULL 
    OR temperature < -50 
    OR temperature > 150
    OR humidity IS NULL
    OR humidity < 0 
    OR humidity > 100)
ORDER BY timestamp DESC;