# src/services/eia_service.py - FIXED VERSION
import requests
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
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
        Fetch electricity demand data from EIA API using correct v2 endpoints
        """
        all_records = []
        
        for region in regions:
            try:
                logger.info(f"Fetching electricity demand for region: {region}")
                
                # Correct EIA v2 API endpoint for electricity demand by balancing authority
                url = f"{self.base_url}/electricity/rto/region-data/data/"
                
                params = {
                    'api_key': self.api_key,
                    'frequency': 'hourly',
                    'data[0]': 'value',
                    'facets[respondent][]': region,
                    'facets[type][]': 'D',  # D = Demand
                    'start': start_date.strftime('%Y-%m-%dT%H'),
                    'end': end_date.strftime('%Y-%m-%dT%H'),
                    'sort[0][column]': 'period',
                    'sort[0][direction]': 'asc',
                    'offset': 0,
                    'length': 5000
                }
                
                logger.info(f"Making request to: {url}")
                logger.info(f"With params: {params}")
                
                response = self.session.get(url, params=params, timeout=30)
                
                logger.info(f"Response status: {response.status_code}")
                logger.info(f"Response headers: {dict(response.headers)}")
                
                response.raise_for_status()
                
                data = response.json()
                logger.info(f"Response data keys: {data.keys() if isinstance(data, dict) else 'Not a dict'}")
                
                if 'response' in data and 'data' in data['response']:
                    records_data = data['response']['data']
                    logger.info(f"Found {len(records_data)} records in response")
                    
                    for record in records_data:
                        if record.get('value') is not None:
                            consumption_record = EnergyConsumptionCreate(
                                region=region,
                                timestamp=pd.to_datetime(record['period']),
                                consumption_mwh=float(record['value']),
                                energy_type='electricity',
                                data_source='EIA'
                            )
                            all_records.append(consumption_record)
                else:
                    logger.warning(f"Unexpected response structure: {data}")
                
                region_records = len([r for r in all_records if r.region == region])
                logger.info(f"Successfully processed {region_records} records for {region}")
                
            except requests.RequestException as e:
                logger.error(f"API request failed for region {region}: {str(e)}")
                logger.error(f"Response content: {e.response.text if hasattr(e, 'response') and e.response else 'No response'}")
                continue
            except Exception as e:
                logger.error(f"Unexpected error for region {region}: {str(e)}")
                continue
        
        logger.info(f"Total records fetched across all regions: {len(all_records)}")
        return all_records

    async def test_api_connection(self) -> Dict[str, Any]:
        """Test the EIA API connection and available data"""
        try:
            # Test with a simple metadata call
            url = f"{self.base_url}/electricity/rto/region-data/"
            params = {'api_key': self.api_key}
            
            response = self.session.get(url, params=params, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            
            return {
                'status': 'success',
                'message': 'EIA API connection successful',
                'available_facets': data.get('response', {}).get('facets', {}),
                'data_available': bool(data.get('response', {}).get('data'))
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'message': f'EIA API connection failed: {str(e)}',
                'response_text': getattr(e, 'response', {}).get('text', '') if hasattr(e, 'response') else ''
            }
