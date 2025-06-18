# src/core/config.py
from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    # Database - will read from .env or use defaults
    database_url: str = os.getenv("DATABASE_URL", "postgresql://postgres:changeme@localhost:5432/energy_pipeline")
    database_url_async: str = os.getenv("DATABASE_URL_ASYNC", "postgresql+asyncpg://postgres:changeme@localhost:5432/energy_pipeline")
    
    # API Keys - will read from .env
    eia_api_key: str = "not_configured"
    openweather_api_key: str = "not_configured"
    
    # Application
    app_name: str = "Energy Pipeline API"
    debug: bool = True
    version: str = "1.0.0"
    log_level: str = "INFO"
    
    # Redis (for caching and task queue)
    redis_url: str = "redis://redis:6379/0"
    
    # API Configuration
    api_v1_str: str = "/api/v1"
    
    # Rate Limiting
    requests_per_minute: int = 100
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        
    def __init__(self, **kwargs):  # Fixed: __ not **
        super().__init__(**kwargs)
        # Debug: Print what we loaded (but hide most of the key for security)
        eia_status = "✅ Loaded" if self.eia_api_key != "not_configured" and len(self.eia_api_key) > 10 else "❌ Missing"
        weather_status = "✅ Loaded" if self.openweather_api_key != "not_configured" and len(self.openweather_api_key) > 10 else "❌ Missing"
        
        print(f"🔑 EIA API Key: {eia_status}")
        print(f"🌤️ Weather API Key: {weather_status}")
        # Mask password in DB URL for debug output
        db_url_masked = self.database_url.replace(self.database_url.split(':')[2].split('@')[0], '****') if '://' in self.database_url and '@' in self.database_url else self.database_url
        print(f"🐘 Database: {db_url_masked}")

settings = Settings()