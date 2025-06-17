# create_quality_tables.py - Force create quality system tables
import sys
import os

# Add the project root to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.database.connection import db_manager
from src.database.models import Base
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_quality_tables():
    """Force create all quality system tables"""
    print("🔧 Creating Quality System Tables...")
    print("=" * 40)
    
    try:
        # Create all tables
        db_manager.create_tables()
        print("✅ Quality system tables created successfully!")
        
        # Verify tables exist
        from sqlalchemy import text
        with db_manager.sync_engine.connect() as connection:
            result = connection.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                AND table_name LIKE '%quality%'
                ORDER BY table_name
            """))
            
            quality_tables = [row[0] for row in result.fetchall()]
            
            print(f"\n📋 Quality Tables Created:")
            for table in quality_tables:
                print(f"   ✅ {table}")
                
            if not quality_tables:
                print("⚠️ No quality tables found. Checking all tables...")
                
                all_result = connection.execute(text("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public'
                    ORDER BY table_name
                """))
                
                all_tables = [row[0] for row in all_result.fetchall()]
                print(f"📋 All Tables:")
                for table in all_tables:
                    print(f"   • {table}")
                    
        print(f"\n🚀 Quality system is ready!")
        print(f"Now restart the API server: docker-compose restart api")
        
    except Exception as e:
        logger.error(f"❌ Failed to create quality tables: {str(e)}")
        print(f"\n🔧 Troubleshooting:")
        print(f"1. Check if database is running: docker-compose ps")
        print(f"2. Check database logs: docker-compose logs postgres")
        print(f"3. Verify connection settings in .env file")

if __name__ == "__main__":
    create_quality_tables()