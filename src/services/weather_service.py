# src/services/weather_service.py
import requests
from datetime import datetime
from typing import List, Dict, Optional
from src.core.config import settings
from src.schemas.energy import WeatherDataCreate
import logging

logger = logging.getLogger(__name__)

class WeatherService:
    def __init__(self):
        self.api_key = settings.openweather_api_key
        self.base_url = "http://api.openweathermap.org/data/2.5"
        self.session = requests.Session()
    
    async def get_current_weather(self, cities: List[str]) -> List[WeatherDataCreate]:
        """Get current weather data for specified cities"""
        weather_records = []
        
        for city in cities:
            try:
                logger.info(f"Fetching weather data for: {city}")
                
                params = {
                    'q': city,
                    'appid': self.api_key,
                    'units': 'imperial'
                }
                
                response = self.session.get(f"{self.base_url}/weather", params=params, timeout=15)
                response.raise_for_status()
                
                data = response.json()
                
                weather_record = WeatherDataCreate(
                    region=city,
                    timestamp=datetime.now(),
                    temperature=float(data['main']['temp']),
                    humidity=float(data['main']['humidity']),
                    wind_speed=float(data['wind'].get('speed', 0)),
                    pressure=float(data['main'].get('pressure', 0))
                )
                
                weather_records.append(weather_record)
                logger.info(f"Successfully fetched weather data for {city}")
                
            except requests.RequestException as e:
                logger.error(f"Weather API request failed for {city}: {str(e)}")
                continue
            except Exception as e:
                logger.error(f"Unexpected error fetching weather for {city}: {str(e)}")
                continue
        
        return weather_records
    
    async def get_historical_weather(
        self, 
        city: str, 
        start_date: datetime, 
        end_date: datetime
    ) -> List[WeatherDataCreate]:
        """Get historical weather data (requires paid plan)"""
        # Implementation for historical weather data
        # This would require OpenWeather's Historical API (paid)
        logger.warning("Historical weather data requires paid OpenWeather plan")
        return []