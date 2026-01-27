-- TimescaleDB Optimization for EnergyGuard IoT
-- This script should be run after the base migrations

-- Enable TimescaleDB extension (usually already enabled)
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Convert telemetry table to hypertable for optimal time-series performance
-- Note: This requires the table to have no foreign key constraints pointing TO it
SELECT create_hypertable('telemetry', 'time', 
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_telemetry_engine_time_desc 
ON telemetry (engine_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_events_engine_time 
ON events (engine_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_engine_created 
ON alerts (engine_id, created_at DESC);

-- Add compression policy for old telemetry data (compress after 7 days)
SELECT add_compression_policy('telemetry', INTERVAL '7 days', if_not_exists => TRUE);

-- Set compression settings
ALTER TABLE telemetry SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'engine_id',
    timescaledb.compress_orderby = 'time DESC'
);

-- Add retention policy to drop old telemetry data (keep 90 days)
SELECT add_retention_policy('telemetry', INTERVAL '90 days', if_not_exists => TRUE);

-- Create continuous aggregate for hourly telemetry averages
CREATE MATERIALIZED VIEW IF NOT EXISTS telemetry_hourly
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 hour', time) AS bucket,
    engine_id,
    AVG(power_kw) AS avg_power,
    AVG(temp_exhaust) AS avg_temp,
    AVG(gas_consumption) AS avg_gas,
    AVG(vibration) AS avg_vibration,
    AVG(gas_pressure) AS avg_gas_pressure,
    MAX(power_kw) AS max_power,
    MAX(temp_exhaust) AS max_temp,
    MAX(vibration) AS max_vibration,
    COUNT(*) AS sample_count
FROM telemetry
GROUP BY bucket, engine_id
WITH NO DATA;

-- Create continuous aggregate for daily telemetry averages
CREATE MATERIALIZED VIEW IF NOT EXISTS telemetry_daily
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 day', time) AS bucket,
    engine_id,
    AVG(power_kw) AS avg_power,
    AVG(temp_exhaust) AS avg_temp,
    AVG(gas_consumption) AS avg_gas,
    AVG(vibration) AS avg_vibration,
    AVG(gas_pressure) AS avg_gas_pressure,
    MAX(power_kw) AS max_power,
    MAX(temp_exhaust) AS max_temp,
    MAX(vibration) AS max_vibration,
    MIN(power_kw) AS min_power,
    SUM(gas_consumption) AS total_gas,
    COUNT(*) AS sample_count
FROM telemetry
GROUP BY bucket, engine_id
WITH NO DATA;

-- Add refresh policies for continuous aggregates
SELECT add_continuous_aggregate_policy('telemetry_hourly',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour',
    if_not_exists => TRUE
);

SELECT add_continuous_aggregate_policy('telemetry_daily',
    start_offset => INTERVAL '3 days',
    end_offset => INTERVAL '1 day',
    schedule_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- Create index on continuous aggregates
CREATE INDEX IF NOT EXISTS idx_telemetry_hourly_engine 
ON telemetry_hourly (engine_id, bucket DESC);

CREATE INDEX IF NOT EXISTS idx_telemetry_daily_engine 
ON telemetry_daily (engine_id, bucket DESC);

-- Refresh the continuous aggregates initially
CALL refresh_continuous_aggregate('telemetry_hourly', NULL, NULL);
CALL refresh_continuous_aggregate('telemetry_daily', NULL, NULL);
