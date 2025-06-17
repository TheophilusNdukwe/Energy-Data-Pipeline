# src/schemas/energy.py
from pydantic import BaseModel, Field, validator
from datetime import datetime
from typing import Optional, List
from decimal import Decimal

class EnergyConsumptionBase(BaseModel):
    region: str = Field(..., min_length=1, max_length=100)
    timestamp: datetime
    consumption_mwh: Optional[Decimal] = Field(None, ge=0)
    energy_type: str = Field(..., min_length=1, max_length=50)
    data_source: str = Field(..., min_length=1, max_length=50)

class EnergyConsumptionCreate(EnergyConsumptionBase):
    pass

class EnergyConsumptionResponse(EnergyConsumptionBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class WeatherDataBase(BaseModel):
    region: str = Field(..., min_length=1, max_length=100)
    timestamp: datetime
    temperature: Optional[Decimal] = None
    humidity: Optional[Decimal] = Field(None, ge=0, le=100)
    wind_speed: Optional[Decimal] = Field(None, ge=0)
    pressure: Optional[Decimal] = Field(None, ge=0)

class WeatherDataCreate(WeatherDataBase):
    pass

class WeatherDataResponse(WeatherDataBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

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
    metadata: Optional[str] = None
    
    class Config:
        from_attributes = True