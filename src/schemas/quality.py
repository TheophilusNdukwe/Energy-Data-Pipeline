# src/schemas/quality.py
from pydantic import BaseModel, Field, validator
from datetime import datetime
from typing import Optional, List, Dict, Any
from decimal import Decimal

# Existing schemas (updated)
class DataQualityLogResponse(BaseModel):
    id: int
    table_name: str
    check_type: str
    status: str
    message: Optional[str] = None
    records_checked: Optional[int] = None
    errors_found: Optional[int] = None
    timestamp: datetime
    
    class Config:
        from_attributes = True

class PipelineRunResponse(BaseModel):
    id: int
    pipeline_name: str
    status: str
    start_time: datetime
    end_time: Optional[datetime] = None
    records_processed: int
    error_message: Optional[str] = None
    extra_data: Optional[str] = None
    
    class Config:
        from_attributes = True

# NEW: Enhanced Quality Schemas
class DataQualityMetricsResponse(BaseModel):
    id: int
    table_name: str
    metric_name: str
    metric_value: float
    total_records: int
    valid_records: int
    invalid_records: int
    calculated_at: datetime
    calculation_period_start: datetime
    calculation_period_end: datetime
    
    class Config:
        from_attributes = True

class DataQualityIssueResponse(BaseModel):
    id: int
    table_name: str
    record_id: Optional[int] = None
    issue_type: str
    issue_description: Optional[str] = None
    severity: str
    status: str
    detected_at: datetime
    resolved_at: Optional[datetime] = None
    resolution_notes: Optional[str] = None
    
    class Config:
        from_attributes = True

class QualityTrendResponse(BaseModel):
    id: int
    metric_name: str
    period_type: str
    period_start: datetime
    period_end: datetime
    avg_score: float
    min_score: float
    max_score: float
    trend_direction: Optional[str] = None
    trend_percentage: Optional[float] = None
    calculated_at: datetime
    
    class Config:
        from_attributes = True

class DataQualityRuleResponse(BaseModel):
    id: int
    table_name: str
    column_name: str
    rule_type: str
    rule_config: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Request/Summary schemas
class QualityOverviewResponse(BaseModel):
    """Comprehensive quality overview for the dashboard"""
    overall_score: float
    metrics: List[DataQualityMetricsResponse]
    recent_issues: List[DataQualityIssueResponse]
    trends: List[QualityTrendResponse]
    validation_summary: Dict[str, Any]

class ValidationResultResponse(BaseModel):
    """Real-time validation results"""
    table_name: str
    total_records: int
    passed: int
    warnings: int
    errors: int
    last_check: datetime
    pass_rate: float
    issues_by_type: Dict[str, int]

class QualityScoreResponse(BaseModel):
    """Individual quality score with trend"""
    name: str
    score: float
    status: str  # excellent, good, warning, poor
    trend: str   # +2.1%, -1.5%, etc.
    description: str
    last_calculated: datetime

class ComprehensiveQualityResponse(BaseModel):
    """Complete quality response for the frontend"""
    quality_scores: List[QualityScoreResponse]
    validation_results: List[ValidationResultResponse]
    recent_issues: List[DataQualityIssueResponse]
    trends: List[QualityTrendResponse]
    last_updated: datetime