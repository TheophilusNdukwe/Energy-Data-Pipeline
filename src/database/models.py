# src/database/models.py
from sqlalchemy import Column, Integer, String, DateTime, Numeric, Text, Index, Boolean, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()

class EnergyConsumption(Base):
    __tablename__ = "energy_consumption"
    
    id = Column(Integer, primary_key=True, index=True)
    region = Column(String(100), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    consumption_mwh = Column(Numeric(12, 2))
    energy_type = Column(String(50), nullable=False)  # electricity, natural_gas, petroleum
    data_source = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Composite index for uniqueness and performance
    __table_args__ = (
        Index('ix_energy_region_time_type', 'region', 'timestamp', 'energy_type', unique=True),
    )

class WeatherData(Base):
    __tablename__ = "weather_data"
    
    id = Column(Integer, primary_key=True, index=True)
    region = Column(String(100), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    temperature = Column(Numeric(5, 2))
    humidity = Column(Numeric(5, 2))
    wind_speed = Column(Numeric(5, 2))
    pressure = Column(Numeric(7, 2))
    created_at = Column(DateTime, default=func.now())
    
    __table_args__ = (
        Index('ix_weather_region_time', 'region', 'timestamp', unique=True),
    )

class DataQualityLog(Base):
    __tablename__ = "data_quality_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    table_name = Column(String(50), nullable=False)
    check_type = Column(String(50), nullable=False)
    status = Column(String(20), nullable=False)  # PASS, FAIL, WARNING
    message = Column(Text)
    records_checked = Column(Integer)
    errors_found = Column(Integer)
    timestamp = Column(DateTime, default=func.now())

class PipelineRun(Base):
    __tablename__ = "pipeline_runs"
    
    id = Column(Integer, primary_key=True, index=True)
    pipeline_name = Column(String(100), nullable=False)
    status = Column(String(20), nullable=False)  # RUNNING, SUCCESS, FAILED
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime)
    records_processed = Column(Integer, default=0)
    error_message = Column(Text)
    extra_data = Column(Text)  # JSON string for additional info

# NEW: Enhanced Data Quality Tables
class DataQualityMetrics(Base):
    """Store calculated quality metrics over time"""
    __tablename__ = "data_quality_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    table_name = Column(String(50), nullable=False, index=True)
    metric_name = Column(String(50), nullable=False)  # completeness, accuracy, consistency, etc.
    metric_value = Column(Float, nullable=False)  # percentage or score
    total_records = Column(Integer, nullable=False)
    valid_records = Column(Integer, nullable=False)
    invalid_records = Column(Integer, nullable=False)
    calculated_at = Column(DateTime, default=func.now(), index=True)
    calculation_period_start = Column(DateTime, nullable=False)
    calculation_period_end = Column(DateTime, nullable=False)
    
    __table_args__ = (
        Index('ix_quality_metrics_table_time', 'table_name', 'calculated_at'),
    )

class DataQualityIssues(Base):
    """Track specific data quality issues found"""
    __tablename__ = "data_quality_issues"
    
    id = Column(Integer, primary_key=True, index=True)
    table_name = Column(String(50), nullable=False, index=True)
    record_id = Column(Integer)  # Reference to the problematic record
    issue_type = Column(String(50), nullable=False)  # null_value, invalid_range, duplicate, etc.
    issue_description = Column(Text)
    severity = Column(String(20), nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    status = Column(String(20), nullable=False)  # OPEN, RESOLVED, IGNORED
    detected_at = Column(DateTime, default=func.now(), index=True)
    resolved_at = Column(DateTime)
    resolution_notes = Column(Text)
    
    __table_args__ = (
        Index('ix_quality_issues_table_severity_status', 'table_name', 'severity', 'status'),
    )

class DataQualityRules(Base):
    """Define data quality validation rules"""
    __tablename__ = "data_quality_rules"
    
    id = Column(Integer, primary_key=True, index=True)
    table_name = Column(String(50), nullable=False)
    column_name = Column(String(50), nullable=False)
    rule_type = Column(String(50), nullable=False)  # not_null, range_check, format_check, etc.
    rule_config = Column(Text)  # JSON configuration for the rule
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class QualityTrends(Base):
    """Store aggregated quality trends for reporting"""
    __tablename__ = "quality_trends"
    
    id = Column(Integer, primary_key=True, index=True)
    metric_name = Column(String(50), nullable=False)
    period_type = Column(String(20), nullable=False)  # HOURLY, DAILY, WEEKLY, MONTHLY
    period_start = Column(DateTime, nullable=False, index=True)
    period_end = Column(DateTime, nullable=False)
    avg_score = Column(Float, nullable=False)
    min_score = Column(Float, nullable=False)
    max_score = Column(Float, nullable=False)
    trend_direction = Column(String(20))  # IMPROVING, DECLINING, STABLE
    trend_percentage = Column(Float)  # percentage change vs previous period
    calculated_at = Column(DateTime, default=func.now())
    
    __table_args__ = (
        Index('ix_quality_trends_metric_period', 'metric_name', 'period_start'),
    )