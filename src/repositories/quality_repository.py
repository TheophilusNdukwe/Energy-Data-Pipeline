# src/repositories/quality_repository.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc, func, text
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta

from src.database.models import (
    DataQualityMetrics, DataQualityIssues, QualityTrends, 
    DataQualityRules, DataQualityLog, PipelineRun,
    EnergyConsumption, WeatherData
)
from src.schemas.quality import (
    DataQualityMetricsResponse, DataQualityIssueResponse,
    QualityTrendResponse, ComprehensiveQualityResponse
)
import logging

logger = logging.getLogger(__name__)

class QualityRepository:
    """Repository for data quality operations"""
    
    @staticmethod
    async def store_quality_metric(
        db: AsyncSession,
        table_name: str,
        metric_name: str,
        metric_value: float,
        total_records: int,
        valid_records: int,
        invalid_records: int,
        period_start: datetime,
        period_end: datetime
    ) -> DataQualityMetrics:
        """Store a quality metric calculation"""
        
        metric = DataQualityMetrics(
            table_name=table_name,
            metric_name=metric_name,
            metric_value=metric_value,
            total_records=total_records,
            valid_records=valid_records,
            invalid_records=invalid_records,
            calculated_at=datetime.now(),
            calculation_period_start=period_start,
            calculation_period_end=period_end
        )
        
        db.add(metric)
        await db.commit()
        await db.refresh(metric)
        
        logger.info(f"📊 Stored quality metric: {table_name}.{metric_name} = {metric_value}%")
        return metric
    
    @staticmethod
    async def store_quality_issue(
        db: AsyncSession,
        table_name: str,
        issue_type: str,
        issue_description: str,
        severity: str,
        record_id: Optional[int] = None
    ) -> DataQualityIssues:
        """Store a quality issue"""
        
        issue = DataQualityIssues(
            table_name=table_name,
            record_id=record_id,
            issue_type=issue_type,
            issue_description=issue_description,
            severity=severity,
            status='OPEN',
            detected_at=datetime.now()
        )
        
        db.add(issue)
        await db.commit()
        await db.refresh(issue)
        
        logger.info(f"🚨 Stored quality issue: {severity} {issue_type} in {table_name}")
        return issue
    
    @staticmethod
    async def get_latest_quality_metrics(
        db: AsyncSession,
        table_name: Optional[str] = None,
        limit: int = 50
    ) -> List[DataQualityMetrics]:
        """Get the most recent quality metrics"""
        
        # Get latest metrics per table/metric combination
        subquery = select(
            DataQualityMetrics.table_name,
            DataQualityMetrics.metric_name,
            func.max(DataQualityMetrics.calculated_at).label('latest_time')
        )
        
        if table_name:
            subquery = subquery.where(DataQualityMetrics.table_name == table_name)
        
        subquery = subquery.group_by(
            DataQualityMetrics.table_name,
            DataQualityMetrics.metric_name
        ).subquery()
        
        query = select(DataQualityMetrics).join(
            subquery,
            and_(
                DataQualityMetrics.table_name == subquery.c.table_name,
                DataQualityMetrics.metric_name == subquery.c.metric_name,
                DataQualityMetrics.calculated_at == subquery.c.latest_time
            )
        ).order_by(desc(DataQualityMetrics.calculated_at)).limit(limit)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    @staticmethod
    async def get_quality_issues(
        db: AsyncSession,
        table_name: Optional[str] = None,
        severity: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 100
    ) -> List[DataQualityIssues]:
        """Get quality issues with filters"""
        
        query = select(DataQualityIssues)
        
        conditions = []
        if table_name:
            conditions.append(DataQualityIssues.table_name == table_name)
        if severity:
            conditions.append(DataQualityIssues.severity == severity)
        if status:
            conditions.append(DataQualityIssues.status == status)
        
        if conditions:
            query = query.where(and_(*conditions))
        
        query = query.order_by(desc(DataQualityIssues.detected_at)).limit(limit)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    @staticmethod
    async def get_quality_trends(
        db: AsyncSession,
        metric_name: Optional[str] = None,
        period_type: str = 'DAILY',
        days_back: int = 30
    ) -> List[QualityTrends]:
        """Get quality trends over time"""
        
        start_date = datetime.now() - timedelta(days=days_back)
        
        query = select(QualityTrends).where(
            QualityTrends.period_start >= start_date
        )
        
        if metric_name:
            query = query.where(QualityTrends.metric_name == metric_name)
        
        query = query.where(QualityTrends.period_type == period_type)
        query = query.order_by(QualityTrends.period_start)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    @staticmethod
    async def calculate_data_completeness(
        db: AsyncSession,
        table_name: str,
        required_columns: List[str],
        days_back: int = 30
    ) -> Dict[str, Any]:
        """Calculate data completeness for a table"""
        
        if table_name == 'energy_consumption':
            model = EnergyConsumption
        elif table_name == 'weather_data':
            model = WeatherData
        else:
            raise ValueError(f"Unknown table: {table_name}")
        
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days_back)
        
        # Total records
        total_query = select(func.count(model.id)).where(
            model.timestamp >= start_date
        )
        total_result = await db.execute(total_query)
        total_records = total_result.scalar() or 0
        
        if total_records == 0:
            return {
                'total_records': 0,
                'complete_records': 0,
                'completeness_percentage': 0.0,
                'column_completeness': {}
            }
        
        # Check completeness per column
        column_completeness = {}
        complete_conditions = []
        
        for column in required_columns:
            if hasattr(model, column):
                column_attr = getattr(model, column)
                
                # Count non-null records for this column
                non_null_query = select(func.count(model.id)).where(
                    and_(
                        model.timestamp >= start_date,
                        column_attr.isnot(None)
                    )
                )
                non_null_result = await db.execute(non_null_query)
                non_null_count = non_null_result.scalar() or 0
                
                column_completeness[column] = {
                    'non_null_count': non_null_count,
                    'completeness_percentage': round((non_null_count / total_records) * 100, 2)
                }
                
                complete_conditions.append(column_attr.isnot(None))
        
        # Count records that are complete for ALL required columns
        if complete_conditions:
            complete_query = select(func.count(model.id)).where(
                and_(
                    model.timestamp >= start_date,
                    *complete_conditions
                )
            )
            complete_result = await db.execute(complete_query)
            complete_records = complete_result.scalar() or 0
        else:
            complete_records = total_records
        
        completeness_percentage = round((complete_records / total_records) * 100, 2)
        
        return {
            'total_records': total_records,
            'complete_records': complete_records,
            'completeness_percentage': completeness_percentage,
            'column_completeness': column_completeness
        }
    
    @staticmethod
    async def calculate_data_accuracy(
        db: AsyncSession,
        table_name: str,
        validation_rules: Dict[str, Any],
        days_back: int = 30
    ) -> Dict[str, Any]:
        """Calculate data accuracy based on validation rules"""
        
        if table_name == 'energy_consumption':
            model = EnergyConsumption
        elif table_name == 'weather_data':
            model = WeatherData
        else:
            raise ValueError(f"Unknown table: {table_name}")
        
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days_back)
        
        # Total records
        total_query = select(func.count(model.id)).where(
            model.timestamp >= start_date
        )
        total_result = await db.execute(total_query)
        total_records = total_result.scalar() or 0
        
        if total_records == 0:
            return {
                'total_records': 0,
                'accurate_records': 0,
                'accuracy_percentage': 0.0,
                'validation_results': {}
            }
        
        # Apply validation rules
        validation_results = {}
        accurate_conditions = [model.timestamp >= start_date]
        
        for rule_name, rule_config in validation_rules.items():
            column = rule_config.get('column')
            rule_type = rule_config.get('type')
            
            if not hasattr(model, column):
                continue
            
            column_attr = getattr(model, column)
            
            if rule_type == 'range':
                min_val = rule_config.get('min')
                max_val = rule_config.get('max')
                if min_val is not None and max_val is not None:
                    condition = column_attr.between(min_val, max_val)
                    accurate_conditions.append(condition)
                    
                    # Count valid records for this rule
                    valid_query = select(func.count(model.id)).where(
                        and_(model.timestamp >= start_date, condition)
                    )
                    valid_result = await db.execute(valid_query)
                    valid_count = valid_result.scalar() or 0
                    
                    validation_results[rule_name] = {
                        'valid_count': valid_count,
                        'validity_percentage': round((valid_count / total_records) * 100, 2)
                    }
            
            elif rule_type == 'not_null':
                condition = column_attr.isnot(None)
                accurate_conditions.append(condition)
                
                valid_query = select(func.count(model.id)).where(
                    and_(model.timestamp >= start_date, condition)
                )
                valid_result = await db.execute(valid_query)
                valid_count = valid_result.scalar() or 0
                
                validation_results[rule_name] = {
                    'valid_count': valid_count,
                    'validity_percentage': round((valid_count / total_records) * 100, 2)
                }
        
        # Count records that pass ALL validation rules
        if len(accurate_conditions) > 1:
            accurate_query = select(func.count(model.id)).where(
                and_(*accurate_conditions)
            )
            accurate_result = await db.execute(accurate_query)
            accurate_records = accurate_result.scalar() or 0
        else:
            accurate_records = total_records
        
        accuracy_percentage = round((accurate_records / total_records) * 100, 2)
        
        return {
            'total_records': total_records,
            'accurate_records': accurate_records,
            'accuracy_percentage': accuracy_percentage,
            'validation_results': validation_results
        }
    
    @staticmethod
    async def get_data_quality_summary(
        db: AsyncSession,
        days_back: int = 30
    ) -> Dict[str, Any]:
        """Get comprehensive data quality summary"""
        
        try:
            # Energy data completeness
            energy_completeness = await QualityRepository.calculate_data_completeness(
                db, 'energy_consumption', 
                ['region', 'consumption_mwh', 'energy_type'], 
                days_back
            )
            
            # Energy data accuracy
            energy_accuracy = await QualityRepository.calculate_data_accuracy(
                db, 'energy_consumption',
                {
                    'positive_consumption': {
                        'column': 'consumption_mwh',
                        'type': 'range',
                        'min': 0,
                        'max': 1000000
                    },
                    'valid_timestamp': {
                        'column': 'timestamp',
                        'type': 'not_null'
                    }
                },
                days_back
            )
            
            # Weather data completeness
            weather_completeness = await QualityRepository.calculate_data_completeness(
                db, 'weather_data',
                ['region', 'temperature'],
                days_back
            )
            
            # Weather data accuracy
            weather_accuracy = await QualityRepository.calculate_data_accuracy(
                db, 'weather_data',
                {
                    'temperature_range': {
                        'column': 'temperature',
                        'type': 'range',
                        'min': -50,
                        'max': 150
                    },
                    'humidity_range': {
                        'column': 'humidity',
                        'type': 'range',
                        'min': 0,
                        'max': 100
                    }
                },
                days_back
            )
            
            # Recent issues
            recent_issues = await QualityRepository.get_quality_issues(
                db, status='OPEN', limit=20
            )
            
            return {
                'energy_data': {
                    'completeness': energy_completeness,
                    'accuracy': energy_accuracy
                },
                'weather_data': {
                    'completeness': weather_completeness,
                    'accuracy': weather_accuracy
                },
                'recent_issues_count': len(recent_issues),
                'last_updated': datetime.now()
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to get quality summary: {str(e)}")
            raise
    
    @staticmethod
    async def resolve_quality_issue(
        db: AsyncSession,
        issue_id: int,
        resolution_notes: str
    ) -> DataQualityIssues:
        """Mark a quality issue as resolved"""
        
        query = select(DataQualityIssues).where(DataQualityIssues.id == issue_id)
        result = await db.execute(query)
        issue = result.scalar_one_or_none()
        
        if not issue:
            raise ValueError(f"Quality issue {issue_id} not found")
        
        issue.status = 'RESOLVED'
        issue.resolved_at = datetime.now()
        issue.resolution_notes = resolution_notes
        
        await db.commit()
        await db.refresh(issue)
        
        logger.info(f"✅ Resolved quality issue {issue_id}: {issue.issue_type}")
        return issue