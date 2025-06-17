# check_database_tables.py - Verify quality tables exist
import psycopg2
from sqlalchemy import create_engine, text
from src.core.config import settings

def check_database_tables():
    """Check if the new quality tables exist"""
    print("🔍 Checking Database Tables...")
    print("=" * 40)
    
    try:
        # Connect to database
        engine = create_engine(settings.database_url)
        
        # Check for new quality tables
        quality_tables = [
            'data_quality_metrics',
            'data_quality_issues', 
            'quality_trends',
            'data_quality_rules',
            'data_quality_logs'
        ]
        
        with engine.connect() as connection:
            # Get all table names
            result = connection.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name
            """))
            
            existing_tables = [row[0] for row in result.fetchall()]
            
            print("📋 Existing Tables:")
            for table in existing_tables:
                print(f"   ✅ {table}")
            
            print(f"\n🔍 Quality Tables Status:")
            for table in quality_tables:
                if table in existing_tables:
                    print(f"   ✅ {table} - EXISTS")
                else:
                    print(f"   ❌ {table} - MISSING")
            
            # Count records in key tables
            print(f"\n📊 Record Counts:")
            for table in ['energy_consumption', 'weather_data']:
                if table in existing_tables:
                    count_result = connection.execute(text(f"SELECT COUNT(*) FROM {table}"))
                    count = count_result.scalar()
                    print(f"   📈 {table}: {count:,} records")
                    
            # Check if quality metrics exist
            if 'data_quality_metrics' in existing_tables:
                metrics_result = connection.execute(text("SELECT COUNT(*) FROM data_quality_metrics"))
                metrics_count = metrics_result.scalar()
                print(f"   📊 data_quality_metrics: {metrics_count} metrics stored")
                
                if metrics_count > 0:
                    # Show latest metrics
                    latest_result = connection.execute(text("""
                        SELECT table_name, metric_name, metric_value, calculated_at
                        FROM data_quality_metrics 
                        ORDER BY calculated_at DESC 
                        LIMIT 5
                    """))
                    
                    print(f"\n📈 Latest Quality Metrics:")
                    for row in latest_result.fetchall():
                        print(f"      • {row[0]}.{row[1]}: {row[2]:.1f}% ({row[3]})")
                        
        print(f"\n✅ Database check completed!")
        
    except Exception as e:
        print(f"❌ Database check failed: {str(e)}")
        print(f"\nTry running this to create tables:")
        print(f"docker-compose exec api python -c \"from src.database.connection import db_manager; db_manager.create_tables()\"")

if __name__ == "__main__":
    check_database_tables()