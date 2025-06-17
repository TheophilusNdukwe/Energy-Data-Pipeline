# src/services/eia_service.py
import requests
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from src.core.config import settings
from src.schemas.energy import EnergyConsumptionCreate
import logging

logger = logging.getLogger(__name__)

class EIAService:
    def __init__(self):
        self.api_key = settings.eia_api_key
        self.base_url = "https://api.eia.gov/v2"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Energy-Pipeline/1.0',
            'Accept': 'application/json'
        })
    
    async def get_electricity_demand(
        self, 
        regions: List[str], 
        start_date: datetime, 
        end_date: datetime
    ) -> List[EnergyConsumptionCreate]:
        """
        Fetch electricity demand data from EIA API
        
        Common region codes:
        - US48: US Lower 48
        - CAL: California
        - NYIS: New York
        - TEX: Texas
        - FLA: Florida
        """
        all_records = []
        
        for region in regions:
            try:
                logger.info(f"Fetching electricity demand for region: {region}")
                
                # EIA series ID for hourly electricity demand
                series_id = f"EBA.{region}-ALL.D.H"
                
                params = {
                    'api_key': self.api_key,
                    'frequency': 'hourly',
                    'data[0]': 'value',
                    'start': start_date.strftime('%Y-%m-%dT%H'),
                    'end': end_date.strftime('%Y-%m-%dT%H'),
                    'sort[0][column]': 'period',
                    'sort[0][direction]': 'asc'
                }
                
                url = f"{self.base_url}/electricity/rto/region-data/data/"
                
                response = self.session.get(url, params=params, timeout=30)
                response.raise_for_status()
                
                data = response.json()
                
                if 'data' in data and data['data']:
                    for record in data['data']:
                        if record.get('value') is not None:
                            consumption_record = EnergyConsumptionCreate(
                                region=region,
                                timestamp=pd.to_datetime(record['period']),
                                consumption_mwh=float(record['value']),
                                energy_type='electricity',
                                data_source='EIA'
                            )
                            all_records.append(consumption_record)
                
                logger.info(f"Successfully fetched {len(all_records)} records for {region}")
                
            except requests.RequestException as e:
                logger.error(f"API request failed for region {region}: {str(e)}")
                continue
            except Exception as e:
                logger.error(f"Unexpected error for region {region}: {str(e)}")
                continue
        
        return all_records
    
    async def get_natural_gas_consumption(
        self, 
        start_date: datetime, 
        end_date: datetime
    ) -> List[EnergyConsumptionCreate]:
        """Fetch natural gas consumption data"""
        records = []
        
        try:
            # Natural gas consumption series (monthly data)
            params = {
                'api_key': self.api_key,
                'frequency': 'monthly',
                'data[0]': 'value',
                'start': start_date.strftime('%Y-%m'),
                'end': end_date.strftime('%Y-%m'),
                'sort[0][column]': 'period',
                'sort[0][direction]': 'asc'
            }
            
            # US natural gas consumption
            url = f"{self.base_url}/natural-gas/cons/sum/data/"
            
            response = self.session.get(url, params=params, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            
            if 'data' in data and data['data']:
                for record in data['data']:
                    if record.get('value') is not None:
                        consumption_record = EnergyConsumptionCreate(
                            region='US',
                            timestamp=pd.to_datetime(record['period'] + '-01'),
                            consumption_mwh=float(record['value']),
                            energy_type='natural_gas',
                            data_source='EIA'
                        )
                        records.append(consumption_record)
            
            logger.info(f"Successfully fetched {len(records)} natural gas records")
            
        except Exception as e:
            logger.error(f"Error fetching natural gas data: {str(e)}")
        
        return records