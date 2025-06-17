# src/services/quality_monitor.py
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional

from src.database.connection import db_manager
from src.services.data_quality_service import DataQualityService
from src.repositories.quality_repository import QualityRepository

logger = logging.getLogger(__name__)

class QualityMonitor:
    """Background service for automated quality monitoring"""
    
    def __init__(self):
        self.quality_service = DataQualityService()
        self.is_running = False
        self.monitor_task: Optional[asyncio.Task] = None
        
        # Configuration
        self.check_interval_minutes = 60  # Run quality checks every hour
        self.alert_threshold = 70.0  # Alert if quality score drops below this
        
    async def start_monitoring(self):
        """Start the background quality monitoring"""
        if self.is_running:
            logger.warning("⚠️ Quality monitor is already running")
            return
            
        self.is_running = True
        self.monitor_task = asyncio.create_task(self._monitoring_loop())
        logger.info(f"🔍 Quality monitoring started - checks every {self.check_interval_minutes} minutes")
        
    async def stop_monitoring(self):
        """Stop the background quality monitoring"""
        if not self.is_running:
            return
            
        self.is_running = False
        if self.monitor_task:
            self.monitor_task.cancel()
            try:
                await self.monitor_task
            except asyncio.CancelledError:
                pass
                
        logger.info("⏹️ Quality monitoring stopped")
        
    async def _monitoring_loop(self):
        """Main monitoring loop"""
        logger.info("🔄 Quality monitoring loop started")
        
        while self.is_running:
            try:
                await self._run_scheduled_quality_check()
                
                # Wait for next check
                await asyncio.sleep(self.check_interval_minutes * 60)
                
            except asyncio.CancelledError:
                logger.info("📛 Quality monitoring cancelled")
                break
            except Exception as e:
                logger.error(f"❌ Error in quality monitoring loop: {str(e)}")
                # Wait a bit before retrying to avoid rapid error loops
                await asyncio.sleep(300)  # 5 minutes
                
    async def _run_scheduled_quality_check(self):
        """Run a scheduled quality check"""
        logger.info("⏰ Running scheduled quality check...")
        
        try:
            async with db_manager.get_async_session() as db:
                # Run comprehensive quality check
                results = await self.quality_service.run_comprehensive_quality_check(db)
                
                overall_score = results.get('overall_score', 0)
                logger.info(f"📊 Scheduled quality check completed: Overall score {overall_score}%")
                
                # Check for alerts
                await self._check_quality_alerts(db, results)
                
                # Store monitoring log
                await self._log_monitoring_check(db, overall_score, results)
                
        except Exception as e:
            logger.error(f"❌ Scheduled quality check failed: {str(e)}")
            
    async def _check_quality_alerts(self, db, results: dict):
        """Check if quality scores require alerts"""
        overall_score = results.get('overall_score', 0)
        
        if overall_score < self.alert_threshold:
            await self._create_quality_alert(
                db, 
                severity='HIGH',
                message=f'Overall data quality score dropped to {overall_score}% (below threshold of {self.alert_threshold}%)',
                details=results
            )
            
        # Check individual table scores
        energy_data = results.get('energy_data', {})
        weather_data = results.get('weather_data', {})
        
        for table_name, table_data in [('energy_consumption', energy_data), ('weather_data', weather_data)]:
            completeness = table_data.get('completeness_score', 100)
            accuracy = table_data.get('accuracy_score', 100)
            
            if completeness < 80:
                await self._create_quality_alert(
                    db,
                    severity='MEDIUM', 
                    message=f'{table_name} completeness dropped to {completeness}%',
                    details={'table': table_name, 'completeness': completeness}
                )
                
            if accuracy < 85:
                await self._create_quality_alert(
                    db,
                    severity='MEDIUM',
                    message=f'{table_name} accuracy dropped to {accuracy}%', 
                    details={'table': table_name, 'accuracy': accuracy}
                )
                
    async def _create_quality_alert(self, db, severity: str, message: str, details: dict):
        """Create a quality alert/issue"""
        try:
            await QualityRepository.store_quality_issue(
                db=db,
                table_name='system_monitoring',
                issue_type='quality_degradation',
                issue_description=message,
                severity=severity
            )
            
            logger.warning(f"🚨 Quality Alert [{severity}]: {message}")
            
        except Exception as e:
            logger.error(f"❌ Failed to create quality alert: {str(e)}")
            
    async def _log_monitoring_check(self, db, overall_score: float, results: dict):
        """Log the monitoring check results"""
        try:
            # Store overall quality metric
            await QualityRepository.store_quality_metric(
                db=db,
                table_name='system_overall',
                metric_name='overall_quality_score',
                metric_value=overall_score,
                total_records=results.get('total_records', 0),
                valid_records=results.get('valid_records', 0),
                invalid_records=results.get('invalid_records', 0),
                period_start=datetime.now() - timedelta(hours=1),
                period_end=datetime.now()
            )
            
        except Exception as e:
            logger.error(f"❌ Failed to log monitoring check: {str(e)}")
            
    async def get_monitoring_status(self) -> dict:
        """Get current monitoring status"""
        return {
            'is_running': self.is_running,
            'check_interval_minutes': self.check_interval_minutes,
            'alert_threshold': self.alert_threshold,
            'last_check': datetime.now().isoformat() if self.is_running else None
        }
        
    async def run_immediate_check(self) -> dict:
        """Run an immediate quality check (for manual triggers)"""
        logger.info("🚀 Running immediate quality check...")
        
        try:
            async with db_manager.get_async_session() as db:
                results = await self.quality_service.run_comprehensive_quality_check(db)
                
                overall_score = results.get('overall_score', 0)
                logger.info(f"✅ Immediate quality check completed: {overall_score}%")
                
                await self._check_quality_alerts(db, results)
                
                return {
                    'status': 'completed',
                    'overall_score': overall_score,
                    'timestamp': datetime.now().isoformat(),
                    'results': results
                }
                
        except Exception as e:
            logger.error(f"❌ Immediate quality check failed: {str(e)}")
            return {
                'status': 'failed',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }

# Global quality monitor instance
quality_monitor = QualityMonitor()