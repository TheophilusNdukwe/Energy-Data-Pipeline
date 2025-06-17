# src/main.py - Complete API with Data Ingestion
from fastapi import FastAPI, Depends, Query, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import datetime, timedelta
import logging

from src.core.config import settings
from src.database.connection import get_db, db_manager
from src.repositories.energy_repository import EnergyRepository, WeatherRepository
from src.repositories.quality_repository import QualityRepository
from src.services.eia_service import EIAService
from src.services.weather_service import WeatherService
from src.services.data_processor import DataProcessor
from src.services.data_quality_service import DataQualityService
from src.services.quality_monitor import quality_monitor
from src.schemas.quality import ComprehensiveQualityResponse

# Configure logging
logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Energy Pipeline API",
    version="1.0.0",
    description="Production-ready data pipeline for energy consumption analytics"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://127.0.0.1:3000",
        "http://localhost:3001", 
        "http://127.0.0.1:3001"
    ],  # Frontend origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
eia_service = EIAService()
weather_service = WeatherService()
data_processor = DataProcessor()
quality_service = DataQualityService()

@app.on_event("startup")
async def startup_event():
    """Initialize database tables and start background services on startup"""
    try:
        db_manager.create_tables()
        logger.info("✅ Database tables created successfully")
        
        # Start quality monitoring
        await quality_monitor.start_monitoring()
        logger.info("✅ Quality monitoring started")
        
    except Exception as e:
        logger.error(f"❌ Startup failed: {str(e)}")

@app.on_event("shutdown")
async def shutdown_event():
    """Clean shutdown of background services"""
    try:
        await quality_monitor.stop_monitoring()
        logger.info("✅ Background services stopped")
    except Exception as e:
        logger.error(f"❌ Shutdown error: {str(e)}")

@app.get("/")
async def root():
    return {
        "message": "Energy Pipeline API",
        "status": "operational",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "energy_data": "/api/v1/energy/consumption",
            "energy_summary": "/api/v1/energy/summary",
            "weather_data": "/api/v1/weather/current",
            "run_energy_pipeline": "/api/v1/pipeline/run-energy-ingestion",
            "run_weather_pipeline": "/api/v1/pipeline/run-weather-ingestion",
            "api_docs": "/docs"
        }
    }

@app.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    try:
        from sqlalchemy import text
        result = await db.execute(text("SELECT 1"))
        result.scalar()
        
        return {
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.now().isoformat(),
            "api_keys": {
                "eia_configured": bool(settings.eia_api_key and settings.eia_api_key != "dummy_key"),
                "weather_configured": bool(settings.openweather_api_key and settings.openweather_api_key != "dummy_key")
            }
        }
    except Exception as e:
        return {
            "status": "unhealthy", 
            "database": "disconnected",
            "error": str(e)
        }

@app.get("/api/v1/energy/consumption")
async def get_energy_consumption(
    region: Optional[str] = Query(None, description="Region filter"),
    energy_type: Optional[str] = Query(None, description="Energy type filter"),
    start_date: Optional[datetime] = Query(None, description="Start date filter"),
    end_date: Optional[datetime] = Query(None, description="End date filter"),
    limit: int = Query(100, ge=1, le=1000, description="Number of records"),
    db: AsyncSession = Depends(get_db)
):
    """Get energy consumption data with optional filters"""
    try:
        records = await EnergyRepository.get_energy_consumption(
            db=db,
            region=region,
            energy_type=energy_type,
            start_date=start_date,
            end_date=end_date,
            limit=limit
        )
        return {
            "status": "success",
            "count": len(records),
            "filters": {
                "region": region,
                "energy_type": energy_type,
                "start_date": start_date.isoformat() if start_date else None,
                "end_date": end_date.isoformat() if end_date else None,
                "limit": limit
            },
            "data": [
                {
                    "id": r.id,
                    "region": r.region,
                    "timestamp": r.timestamp.isoformat(),
                    "consumption_mwh": float(r.consumption_mwh) if r.consumption_mwh else None,
                    "energy_type": r.energy_type,
                    "data_source": r.data_source,
                    "created_at": r.created_at.isoformat()
                } for r in records
            ]
        }
    except Exception as e:
        logger.error(f"Error fetching energy consumption: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/v1/energy/summary")
async def get_consumption_summary(
    region: Optional[str] = Query(None, description="Region filter"),
    days_back: int = Query(30, ge=1, le=365, description="Days to look back"),
    db: AsyncSession = Depends(get_db)
):
    """Get energy consumption summary statistics"""
    try:
        summary = await EnergyRepository.get_consumption_summary(
            db=db,
            region=region,
            days_back=days_back
        )
        return {
            "status": "success",
            "summary": summary
        }
    except Exception as e:
        logger.error(f"Error fetching consumption summary: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/v1/weather/current")
async def get_current_weather(
    region: Optional[str] = Query(None, description="Region filter"),
    db: AsyncSession = Depends(get_db)
):
    """Get latest weather data"""
    try:
        records = await WeatherRepository.get_latest_weather(db=db, region=region)
        return {
            "status": "success",
            "count": len(records),
            "data": [
                {
                    "id": r.id,
                    "region": r.region,
                    "timestamp": r.timestamp.isoformat(),
                    "temperature": float(r.temperature) if r.temperature else None,
                    "humidity": float(r.humidity) if r.humidity else None,
                    "wind_speed": float(r.wind_speed) if r.wind_speed else None,
                    "pressure": float(r.pressure) if r.pressure else None,
                    "created_at": r.created_at.isoformat()
                } for r in records
            ]
        }
    except Exception as e:
        logger.error(f"Error fetching weather data: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/api/v1/pipeline/run-energy-ingestion")
async def run_energy_ingestion(
    background_tasks: BackgroundTasks,
    regions: List[str] = Query(["US48", "CAL", "NYIS"], description="Regions to fetch (US48=US Lower 48, CAL=California, NYIS=New York)"),
    days_back: int = Query(7, ge=1, le=30, description="Days of data to fetch"),
    db: AsyncSession = Depends(get_db)
):
    """Trigger energy data ingestion pipeline"""
    
    # Check if API key is configured
    if not settings.eia_api_key or settings.eia_api_key == "dummy_key":
        raise HTTPException(
            status_code=400, 
            detail="EIA API key not configured. Please set EIA_API_KEY in your .env file"
        )
    
    async def run_pipeline():
        start_time = datetime.now()
        pipeline_name = "energy_ingestion"
        
        try:
            logger.info(f"🚀 Starting energy ingestion pipeline for regions: {regions}")
            
            # Calculate date range
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days_back)
            
            logger.info(f"📅 Fetching data from {start_date.date()} to {end_date.date()}")
            
            # Fetch data from EIA
            raw_records = await eia_service.get_electricity_demand(
                regions=regions,
                start_date=start_date,
                end_date=end_date
            )
            
            logger.info(f"📊 Fetched {len(raw_records)} raw records from EIA")
            
            # Process and validate data
            validated_records, validation_report = data_processor.validate_energy_data(raw_records)
            cleaned_records = data_processor.detect_outliers(validated_records)
            
            logger.info(f"🔍 Validation complete: {len(cleaned_records)} valid records")
            
            # Save to database
            result = await EnergyRepository.create_energy_records(db, cleaned_records)
            
            # Run quality check after data ingestion
            try:
                logger.info("🔍 Running post-ingestion quality check...")
                quality_results = await quality_service.run_comprehensive_quality_check(db)
                logger.info(f"📊 Quality check completed: Overall score {quality_results.get('overall_score', 0)}%")
            except Exception as quality_error:
                logger.warning(f"⚠️ Quality check failed but ingestion succeeded: {str(quality_error)}")
                # Don't fail the pipeline if quality check fails
            
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            logger.info(f"✅ Pipeline completed successfully in {duration:.2f}s: {result}")
            
            return {
                "status": "completed",
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "duration_seconds": duration,
                "regions": regions,
                "date_range": {
                    "start": start_date.date().isoformat(),
                    "end": end_date.date().isoformat()
                },
                "records_fetched": len(raw_records),
                "records_created": result['created'],
                "records_skipped": result['skipped'],
                "records_errors": result['errors'],
                "validation_report": validation_report
            }
            
        except Exception as e:
            logger.error(f"❌ Pipeline failed: {str(e)}")
            return {
                "status": "failed",
                "error": str(e),
                "start_time": start_time.isoformat(),
                "end_time": datetime.now().isoformat()
            }
    
    # Run pipeline in background
    background_tasks.add_task(run_pipeline)
    
    return {
        "message": "Energy ingestion pipeline started",
        "regions": regions,
        "days_back": days_back,
        "status": "running",
        "note": "Check the /api/v1/energy/consumption endpoint in a few moments to see results"
    }

@app.post("/api/v1/pipeline/run-weather-ingestion")
async def run_weather_ingestion(
    background_tasks: BackgroundTasks,
    cities: List[str] = Query(["Boston", "New York", "Los Angeles", "Chicago"], description="Cities to fetch weather for"),
    db: AsyncSession = Depends(get_db)
):
    """Trigger weather data ingestion pipeline"""
    
    # Check if API key is configured
    if not settings.openweather_api_key or settings.openweather_api_key == "dummy_key":
        raise HTTPException(
            status_code=400, 
            detail="OpenWeather API key not configured. Please set OPENWEATHER_API_KEY in your .env file"
        )
    
    async def run_pipeline():
        start_time = datetime.now()
        
        try:
            logger.info(f"🌤️ Starting weather ingestion pipeline for cities: {cities}")
            
            # Fetch weather data
            weather_records = await weather_service.get_current_weather(cities)
            
            logger.info(f"📊 Fetched {len(weather_records)} weather records")
            
            # Save to database
            result = await WeatherRepository.create_weather_records(db, weather_records)
            
            # Run quality check after weather data ingestion
            try:
                logger.info("🔍 Running post-weather-ingestion quality check...")
                quality_results = await quality_service.run_comprehensive_quality_check(db)
                logger.info(f"📊 Weather quality check completed: Overall score {quality_results.get('overall_score', 0)}%")
            except Exception as quality_error:
                logger.warning(f"⚠️ Weather quality check failed but ingestion succeeded: {str(quality_error)}")
            
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            logger.info(f"✅ Weather pipeline completed in {duration:.2f}s: {result}")
            
            return {
                "status": "completed",
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "duration_seconds": duration,
                "cities": cities,
                "records_created": result['created'],
                "records_skipped": result['skipped'],
                "records_errors": result['errors']
            }
            
        except Exception as e:
            logger.error(f"❌ Weather pipeline failed: {str(e)}")
            return {
                "status": "failed",
                "error": str(e),
                "start_time": start_time.isoformat(),
                "end_time": datetime.now().isoformat()
            }
    
    background_tasks.add_task(run_pipeline)
    
    return {
        "message": "Weather ingestion pipeline started",
        "cities": cities,
        "status": "running",
        "note": "Check the /api/v1/weather/current endpoint in a few moments to see results"
    }

@app.get("/api/v1/status")
async def get_pipeline_status(db: AsyncSession = Depends(get_db)):
    """Get current pipeline and data status"""
    try:
        # Get data counts
        energy_summary = await EnergyRepository.get_consumption_summary(db=db, days_back=30)
        weather_records = await WeatherRepository.get_latest_weather(db=db)
        
        return {
            "status": "operational",
            "data_status": {
                "energy_records_last_30_days": energy_summary.get('total_records', 0),
                "weather_records_available": len(weather_records),
                "last_updated": datetime.now().isoformat()
            },
            "api_keys": {
                "eia_configured": bool(settings.eia_api_key and settings.eia_api_key != "dummy_key"),
                "weather_configured": bool(settings.openweather_api_key and settings.openweather_api_key != "dummy_key")
            }
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

# NEW: Data Quality Endpoints
@app.get("/api/v1/quality/dashboard", response_model=ComprehensiveQualityResponse)
async def get_quality_dashboard(db: AsyncSession = Depends(get_db)):
    """Get comprehensive data quality dashboard information"""
    try:
        logger.info("📊 Fetching quality dashboard data...")
        dashboard_data = await quality_service.get_quality_dashboard_data(db)
        return dashboard_data
    except Exception as e:
        logger.error(f"❌ Quality dashboard error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch quality data: {str(e)}")

@app.post("/api/v1/quality/run-check")
async def run_quality_check(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Trigger a comprehensive data quality check"""
    
    async def run_quality_check_task():
        try:
            logger.info("🔍 Starting manual quality check...")
            results = await quality_service.run_comprehensive_quality_check(db)
            logger.info(f"✅ Quality check completed: Overall score {results.get('overall_score', 0)}%")
            return results
        except Exception as e:
            logger.error(f"❌ Quality check failed: {str(e)}")
            raise
    
    background_tasks.add_task(run_quality_check_task)
    
    return {
        "message": "Data quality check started",
        "status": "running",
        "note": "Check the /api/v1/quality/dashboard endpoint in a few moments for updated results"
    }

@app.get("/api/v1/quality/metrics")
async def get_quality_metrics(
    table_name: Optional[str] = Query(None, description="Filter by table name"),
    limit: int = Query(50, ge=1, le=200, description="Number of metrics to return"),
    db: AsyncSession = Depends(get_db)
):
    """Get latest quality metrics"""
    try:
        metrics = await QualityRepository.get_latest_quality_metrics(db, table_name, limit)
        return {
            "status": "success",
            "count": len(metrics),
            "metrics": [
                {
                    "id": m.id,
                    "table_name": m.table_name,
                    "metric_name": m.metric_name,
                    "metric_value": m.metric_value,
                    "total_records": m.total_records,
                    "valid_records": m.valid_records,
                    "invalid_records": m.invalid_records,
                    "calculated_at": m.calculated_at.isoformat(),
                    "calculation_period_start": m.calculation_period_start.isoformat(),
                    "calculation_period_end": m.calculation_period_end.isoformat()
                } for m in metrics
            ]
        }
    except Exception as e:
        logger.error(f"❌ Error fetching quality metrics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch quality metrics")

@app.get("/api/v1/quality/issues")
async def get_quality_issues(
    table_name: Optional[str] = Query(None, description="Filter by table name"),
    severity: Optional[str] = Query(None, description="Filter by severity (LOW, MEDIUM, HIGH, CRITICAL)"),
    status: Optional[str] = Query(None, description="Filter by status (OPEN, RESOLVED, IGNORED)"),
    limit: int = Query(100, ge=1, le=500, description="Number of issues to return"),
    db: AsyncSession = Depends(get_db)
):
    """Get data quality issues"""
    try:
        issues = await QualityRepository.get_quality_issues(db, table_name, severity, status, limit)
        return {
            "status": "success",
            "count": len(issues),
            "issues": [
                {
                    "id": i.id,
                    "table_name": i.table_name,
                    "record_id": i.record_id,
                    "issue_type": i.issue_type,
                    "issue_description": i.issue_description,
                    "severity": i.severity,
                    "status": i.status,
                    "detected_at": i.detected_at.isoformat(),
                    "resolved_at": i.resolved_at.isoformat() if i.resolved_at else None,
                    "resolution_notes": i.resolution_notes
                } for i in issues
            ]
        }
    except Exception as e:
        logger.error(f"❌ Error fetching quality issues: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch quality issues")

@app.get("/api/v1/quality/summary")
async def get_quality_summary(
    days_back: int = Query(30, ge=1, le=365, description="Days to analyze"),
    db: AsyncSession = Depends(get_db)
):
    """Get comprehensive data quality summary"""
    try:
        summary = await QualityRepository.get_data_quality_summary(db, days_back)
        return {
            "status": "success",
            "summary": summary
        }
    except Exception as e:
        logger.error(f"❌ Error fetching quality summary: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch quality summary")

@app.put("/api/v1/quality/issues/{issue_id}/resolve")
async def resolve_quality_issue(
    issue_id: int,
    resolution_notes: str = Query(..., description="Notes about how the issue was resolved"),
    db: AsyncSession = Depends(get_db)
):
    """Mark a quality issue as resolved"""
    try:
        resolved_issue = await QualityRepository.resolve_quality_issue(db, issue_id, resolution_notes)
        return {
            "status": "success",
            "message": f"Issue {issue_id} marked as resolved",
            "issue": {
                "id": resolved_issue.id,
                "status": resolved_issue.status,
                "resolved_at": resolved_issue.resolved_at.isoformat(),
                "resolution_notes": resolved_issue.resolution_notes
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Error resolving quality issue {issue_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to resolve quality issue")

# NEW: Quality Monitoring Control Endpoints
@app.get("/api/v1/quality/monitoring/status")
async def get_monitoring_status():
    """Get current quality monitoring status"""
    try:
        status = await quality_monitor.get_monitoring_status()
        return {
            "status": "success",
            "monitoring": status
        }
    except Exception as e:
        logger.error(f"❌ Error getting monitoring status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get monitoring status")

@app.post("/api/v1/quality/monitoring/start")
async def start_quality_monitoring():
    """Start automated quality monitoring"""
    try:
        await quality_monitor.start_monitoring()
        return {
            "status": "success",
            "message": "Quality monitoring started",
            "monitoring": await quality_monitor.get_monitoring_status()
        }
    except Exception as e:
        logger.error(f"❌ Error starting monitoring: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to start monitoring")

@app.post("/api/v1/quality/monitoring/stop")
async def stop_quality_monitoring():
    """Stop automated quality monitoring"""
    try:
        await quality_monitor.stop_monitoring()
        return {
            "status": "success",
            "message": "Quality monitoring stopped",
            "monitoring": await quality_monitor.get_monitoring_status()
        }
    except Exception as e:
        logger.error(f"❌ Error stopping monitoring: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to stop monitoring")

@app.post("/api/v1/quality/monitoring/immediate-check")
async def run_immediate_quality_check():
    """Run an immediate quality check"""
    try:
        result = await quality_monitor.run_immediate_check()
        return {
            "status": "success",
            "check_result": result
        }
    except Exception as e:
        logger.error(f"❌ Error running immediate check: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to run immediate quality check")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)