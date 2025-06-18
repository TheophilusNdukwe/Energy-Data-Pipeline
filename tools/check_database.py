#!/usr/bin/env python3
"""
Script to directly check the PostgreSQL database for data
"""

import psycopg2
import os
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def check_database():
    """Connect to PostgreSQL and check for data"""
    
    try:
        # Get database connection details from environment variables
        db_host = os.getenv('DB_HOST', 'localhost')
        db_port = os.getenv('DB_PORT', '5432')
        db_name = os.getenv('DB_NAME', 'energy_pipeline')
        db_user = os.getenv('DB_USER', 'postgres')
        db_password = os.getenv('DB_PASSWORD')
        
        if not db_password:
            print("❌ ERROR: DB_PASSWORD not found in environment variables!")
            print("Please set DB_PASSWORD in your .env file")
            return
        
        # Connect to database
        conn = psycopg2.connect(
            host=db_host,
            port=db_port, 
            database=db_name,
            user=db_user,
            password=db_password
        )
        
        cursor = conn.cursor()
        
        print("🔗 Connected to database successfully!")
        print()
        
        # Check if tables exist
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """)
        tables = cursor.fetchall()
        print(f"📋 Tables in database: {[t[0] for t in tables]}")
        print()
        
        # Check energy_consumption table
        cursor.execute("SELECT COUNT(*) FROM energy_consumption")
        energy_count = cursor.fetchone()[0]
        print(f"⚡ Energy consumption records: {energy_count}")
        
        if energy_count > 0:
            # Get sample records
            cursor.execute("""
                SELECT region, timestamp, consumption_mwh, energy_type, data_source, created_at
                FROM energy_consumption 
                ORDER BY created_at DESC 
                LIMIT 5
            """)
            records = cursor.fetchall()
            
            print("Sample energy records:")
            for record in records:
                print(f"  Region: {record[0]}, Time: {record[1]}, MWh: {record[2]}, Type: {record[3]}")
        
        print()
        
        # Check weather_data table  
        cursor.execute("SELECT COUNT(*) FROM weather_data")
        weather_count = cursor.fetchone()[0]
        print(f"🌤️ Weather records: {weather_count}")
        
        if weather_count > 0:
            cursor.execute("""
                SELECT region, timestamp, temperature, humidity, created_at
                FROM weather_data 
                ORDER BY created_at DESC 
                LIMIT 3
            """)
            records = cursor.fetchall()
            
            print("Sample weather records:")
            for record in records:
                print(f"  Region: {record[0]}, Time: {record[1]}, Temp: {record[2]}°F, Humidity: {record[3]}%")
        
        print()
        
        # Check for recent data
        cursor.execute("""
            SELECT COUNT(*) FROM energy_consumption 
            WHERE created_at >= NOW() - INTERVAL '1 day'
        """)
        recent_count = cursor.fetchone()[0]
        print(f"🕐 Energy records added in last 24 hours: {recent_count}")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        print("Make sure Docker containers are running: docker-compose up -d")

if __name__ == "__main__":
    check_database()
