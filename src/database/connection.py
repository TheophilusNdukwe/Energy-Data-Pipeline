# src/database/connection.py
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from src.core.config import settings
from src.database.models import Base
import logging

logger = logging.getLogger(__name__)

class DatabaseManager:
    def __init__(self):
        # Sync engine for migrations and initial setup
        self.sync_engine = create_engine(settings.database_url, echo=settings.debug)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.sync_engine)
        
        # Async engine for main application
        self.async_engine = create_async_engine(settings.database_url_async, echo=settings.debug)
        self.AsyncSessionLocal = async_sessionmaker(
            bind=self.async_engine, 
            class_=AsyncSession, 
            expire_on_commit=False
        )
    
    def create_tables(self):
        """Create all tables (use only for development)"""
        Base.metadata.create_all(bind=self.sync_engine)
        logger.info("Database tables created successfully")
    
    def get_sync_session(self) -> Session:
        """Get synchronous database session"""
        db = self.SessionLocal()
        try:
            return db
        finally:
            db.close()
    
    @asynccontextmanager
    async def get_async_session(self) -> AsyncGenerator[AsyncSession, None]:
        """Get asynchronous database session"""
        async with self.AsyncSessionLocal() as session:
            try:
                yield session
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()

# Global database manager instance
db_manager = DatabaseManager()

# Dependency for FastAPI
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with db_manager.get_async_session() as session:
        yield session