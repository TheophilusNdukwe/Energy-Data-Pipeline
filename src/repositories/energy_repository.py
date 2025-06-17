# =============================================================================
# 7. REPOSITORY LAYER (DATA ACCESS)
# =============================================================================

# src/repositories/energy_repository.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc, func
from sqlalchemy.exc import IntegrityError
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from src.database.models import EnergyConsumption, WeatherData, DataQualityLog, PipelineRun
from src.schemas.energy import EnergyConsumptionCreate, WeatherDataCreate
import logging

logger = logging.getLogger(__name__)

class EnergyRepository:
    
    @staticmethod
    async def _insert_with_duplicate_handling(
        db: AsyncSession, 
        records: List[EnergyConsumptionCreate]
    ) -> Dict[str, int]:
        """Insert records one by one to handle duplicates gracefully"""
        created_count = 0
        skipped_count = 0
        error_count = 0
        
        for record in records:
            try:
                db_record = EnergyConsumption(
                    region=record.region,
                    timestamp=record.timestamp,
                    consumption_mwh=record.consumption_mwh,
                    energy_type=record.energy_type,
                    data_source=record.data_source
                )
                
                db.add(db_record)
                await db.flush()  # Flush to catch unique constraint violations
                created_count += 1
                
            except IntegrityError:
                await db.rollback()
                skipped_count += 1
                logger.debug(f"Skipped duplicate record: {record.region} at {record.timestamp}")
            except Exception as e:
                await db.rollback()
                error_count += 1
                logger.error(f"Error inserting individual record: {str(e)}")
        
        try:
            await db.commit()
        except Exception as e:
            await db.rollback()
            logger.error(f"Error committing individual records: {str(e)}")
            
        return {
            'created': created_count,
            'skipped': skipped_count,
            'errors': error_count
        }
    
    @staticmethod
    async def create_energy_records(
        db: AsyncSession, 
        records: List[EnergyConsumptionCreate]
    ) -> Dict[str, int]:
        """Bulk insert energy consumption records with duplicate handling"""
        created_count = 0
        skipped_count = 0
        error_count = 0
        
        for record in records:
            try:
                db_record = EnergyConsumption(
                    region=record.region,
                    timestamp=record.timestamp,
                    consumption_mwh=record.consumption_mwh,
                    energy_type=record.energy_type,
                    data_source=record.data_source
                )
                
                db.add(db_record)
                created_count += 1
                logger.debug(f"Added record: {record.region} at {record.timestamp} = {record.consumption_mwh} MWh")
                
            except Exception as e:
                error_count += 1
                logger.error(f"Error creating record object: {str(e)}")
        
        # Single commit at the end
        try:
            await db.commit()
            logger.info(f"Successfully committed {created_count} records")
        except IntegrityError as e:
            await db.rollback()
            logger.error(f"Integrity error during commit (likely duplicates): {str(e)}")
            # Retry with individual inserts to handle duplicates
            return await EnergyRepository._insert_with_duplicate_handling(db, records)
        except Exception as e:
            await db.rollback()
            logger.error(f"Error committing energy records: {str(e)}")
            raise
        

        
        return {
            'created': created_count,
            'skipped': skipped_count,
            'errors': error_count
        }
    
    @staticmethod
    async def get_energy_consumption(
        db: AsyncSession,
        region: Optional[str] = None,
        energy_type: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 1000
    ) -> List[EnergyConsumption]:
        """Query energy consumption data with filters"""
        
        query = select(EnergyConsumption)
        
        # Apply filters
        conditions = []
        if region:
            conditions.append(EnergyConsumption.region == region)
        if energy_type:
            conditions.append(EnergyConsumption.energy_type == energy_type)
        if start_date:
            conditions.append(EnergyConsumption.timestamp >= start_date)
        if end_date:
            conditions.append(EnergyConsumption.timestamp <= end_date)
        
        if conditions:
            query = query.where(and_(*conditions))
        
        query = query.order_by(desc(EnergyConsumption.timestamp)).limit(limit)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    @staticmethod
    async def get_consumption_summary(
        db: AsyncSession,
        region: Optional[str] = None,
        days_back: int = 30
    ) -> Dict[str, Any]:
        """Get consumption summary statistics"""
        
        start_date = datetime.now() - timedelta(days=days_back)
        
        query = select(
            func.count(EnergyConsumption.id).label('total_records'),
            func.avg(EnergyConsumption.consumption_mwh).label('avg_consumption'),
            func.sum(EnergyConsumption.consumption_mwh).label('total_consumption'),
            func.min(EnergyConsumption.consumption_mwh).label('min_consumption'),
            func.max(EnergyConsumption.consumption_mwh).label('max_consumption')
        ).where(EnergyConsumption.timestamp >= start_date)
        
        if region:
            query = query.where(EnergyConsumption.region == region)
        
        result = await db.execute(query)
        row = result.first()
        
        return {
            'total_records': row.total_records or 0,
            'avg_consumption': float(row.avg_consumption or 0),
            'total_consumption': float(row.total_consumption or 0),
            'min_consumption': float(row.min_consumption or 0),
            'max_consumption': float(row.max_consumption or 0),
            'period_days': days_back
        }

class WeatherRepository:
    
    @staticmethod
    async def create_weather_records(
        db: AsyncSession, 
        records: List[WeatherDataCreate]
    ) -> Dict[str, int]:
        """Bulk insert weather records"""
        created_count = 0
        skipped_count = 0
        error_count = 0
        
        for record in records:
            try:
                db_record = WeatherData(
                    region=record.region,
                    timestamp=record.timestamp,
                    temperature=record.temperature,
                    humidity=record.humidity,
                    wind_speed=record.wind_speed,
                    pressure=record.pressure
                )
                
                db.add(db_record)
                await db.flush()
                created_count += 1
                
            except IntegrityError:
                await db.rollback()
                skipped_count += 1
            except Exception as e:
                await db.rollback()
                error_count += 1
                logger.error(f"Error inserting weather record: {str(e)}")
        
        try:
            await db.commit()
        except Exception as e:
            await db.rollback()
            logger.error(f"Error committing weather records: {str(e)}")
            raise
        
        return {
            'created': created_count,
            'skipped': skipped_count,
            'errors': error_count
        }
    
    @staticmethod
    async def get_latest_weather(
        db: AsyncSession,
        region: Optional[str] = None
    ) -> List[WeatherData]:
        """Get latest weather data"""
        
        query = select(WeatherData)
        
        if region:
            query = query.where(WeatherData.region == region)
        
        query = query.order_by(desc(WeatherData.timestamp)).limit(100)
        
        result = await db.execute(query)
        return result.scalars().all()