# =============================================================================
# 6. DATA PROCESSING & VALIDATION
# =============================================================================

# src/services/data_processor.py
import pandas as pd
from typing import List, Dict, Any, Tuple
from src.schemas.energy import EnergyConsumptionCreate, WeatherDataCreate
from src.database.models import DataQualityLog
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class DataProcessor:
    
    @staticmethod
    def validate_energy_data(records: List[EnergyConsumptionCreate]) -> Tuple[List[EnergyConsumptionCreate], Dict[str, Any]]:
        """
        Validate and clean energy consumption data
        Returns: (cleaned_records, validation_report)
        """
        validation_report = {
            'total_input_records': len(records),
            'issues_found': [],
            'cleaned_records_count': 0,
            'removed_records_count': 0
        }
        
        if not records:
            return [], validation_report
        
        cleaned_records = []
        
        for record in records:
            issues = []
            
            # Check for null/invalid consumption values
            if record.consumption_mwh is None:
                issues.append("null_consumption")
            elif record.consumption_mwh < 0:
                issues.append("negative_consumption")
            elif record.consumption_mwh > 1000000:  # Unreasonably high value
                issues.append("excessive_consumption")
            
            # Check timestamp validity
            if record.timestamp > datetime.now():
                issues.append("future_timestamp")
            
            # Check region validity
            if not record.region or len(record.region.strip()) == 0:
                issues.append("invalid_region")
            
            if not issues:
                cleaned_records.append(record)
            else:
                validation_report['issues_found'].extend(issues)
        
        validation_report['cleaned_records_count'] = len(cleaned_records)
        validation_report['removed_records_count'] = len(records) - len(cleaned_records)
        
        logger.info(f"Data validation complete: {validation_report['cleaned_records_count']} valid records out of {validation_report['total_input_records']}")
        
        return cleaned_records, validation_report
    
    @staticmethod
    def detect_outliers(records: List[EnergyConsumptionCreate]) -> List[EnergyConsumptionCreate]:
        """Remove statistical outliers using IQR method"""
        if len(records) < 4:  # Need at least 4 points for IQR
            return records
        
        # Convert to DataFrame for easier processing
        df = pd.DataFrame([{
            'region': r.region,
            'timestamp': r.timestamp,
            'consumption_mwh': float(r.consumption_mwh) if r.consumption_mwh else 0,
            'energy_type': r.energy_type,
            'data_source': r.data_source
        } for r in records])
        
        cleaned_records = []
        
        # Remove outliers by region
        for region in df['region'].unique():
            region_data = df[df['region'] == region]
            
            if len(region_data) < 4:
                # Not enough data for outlier detection
                for _, row in region_data.iterrows():
                    cleaned_records.append(EnergyConsumptionCreate(
                        region=row['region'],
                        timestamp=row['timestamp'],
                        consumption_mwh=row['consumption_mwh'],
                        energy_type=row['energy_type'],
                        data_source=row['data_source']
                    ))
                continue
            
            Q1 = region_data['consumption_mwh'].quantile(0.25)
            Q3 = region_data['consumption_mwh'].quantile(0.75)
            IQR = Q3 - Q1
            
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            
            # Keep only non-outliers
            filtered_data = region_data[
                (region_data['consumption_mwh'] >= lower_bound) & 
                (region_data['consumption_mwh'] <= upper_bound)
            ]
            
            for _, row in filtered_data.iterrows():
                cleaned_records.append(EnergyConsumptionCreate(
                    region=row['region'],
                    timestamp=row['timestamp'],
                    consumption_mwh=row['consumption_mwh'],
                    energy_type=row['energy_type'],
                    data_source=row['data_source']
                ))
        
        removed_count = len(records) - len(cleaned_records)
        if removed_count > 0:
            logger.info(f"Removed {removed_count} outlier records")
        
        return cleaned_records
    
    @staticmethod
    def aggregate_hourly_to_daily(records: List[EnergyConsumptionCreate]) -> List[EnergyConsumptionCreate]:
        """Aggregate hourly consumption data to daily totals"""
        if not records:
            return []
        
        # Convert to DataFrame
        df = pd.DataFrame([{
            'region': r.region,
            'timestamp': r.timestamp,
            'consumption_mwh': float(r.consumption_mwh) if r.consumption_mwh else 0,
            'energy_type': r.energy_type,
            'data_source': r.data_source
        } for r in records])
        
        # Group by region, date, and energy_type
        df['date'] = df['timestamp'].dt.date
        
        daily_agg = df.groupby(['region', 'date', 'energy_type', 'data_source']).agg({
            'consumption_mwh': 'sum'
        }).reset_index()
        
        # Convert back to EnergyConsumptionCreate objects
        aggregated_records = []
        for _, row in daily_agg.iterrows():
            record = EnergyConsumptionCreate(
                region=row['region'],
                timestamp=datetime.combine(row['date'], datetime.min.time()),
                consumption_mwh=row['consumption_mwh'],
                energy_type=row['energy_type'],
                data_source=row['data_source']
            )
            aggregated_records.append(record)
        
        logger.info(f"Aggregated {len(records)} hourly records to {len(aggregated_records)} daily records")
        return aggregated_records
