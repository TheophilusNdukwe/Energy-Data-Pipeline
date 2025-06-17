#!/usr/bin/env python3
"""
Quick database check script - Windows compatible
"""

import psycopg2
import requests
from datetime import datetime

def check_backend_api():
    """Test backend API endpoints"""
    print("🔍 Testing Backend API Endpoints")
    print("=" * 40)
    
    endpoints = [
        ("Health", "http://localhost:8000/health"),
        ("Energy Data", "http://localhost:8000/api/v1/energy/consumption?limit=5"),
        ("Weather Data", "http://localhost:8000/api/v1/weather/current"),
        ("Pipeline Status", "http://localhost:8000/api/v1/status")
    ]
    
    for name, url in endpoints:
        try:
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                data = response.json()
                print(f"✅ {name}: OK")
                
                # Show data counts
                if 'count' in data:
                    print(f"   📊 Records: {data['count']}")
                elif 'data_status' in data:
                    energy_records = data['data_status'].get('energy_records_last_30_days', 0)
                    weather_records = data['data_status'].get('weather_records_available', 0)
                    print(f"   📊 Energy records: {energy_records}")
                    print(f"   🌤️ Weather records: {weather_records}")
                    
            else:
                print(f"❌ {name}: HTTP {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            print(f"❌ {name}: Connection failed - {e}")
        except Exception as e:
            print(f"❌ {name}: Error - {e}")
    
    print()

def check_database_direct():
    """Check database directly"""
    print("🗄️ Testing Direct Database Connection")
    print("=" * 40)
    
    try:
        conn = psycopg2.connect(
            host="localhost",
            port="5432", 
            database="energy_pipeline",
            user="postgres",
            password="password123"
        )
        
        cursor = conn.cursor()
        print("✅ Database connection successful")
        
        # Check energy records
        cursor.execute("SELECT COUNT(*) FROM energy_consumption")
        energy_count = cursor.fetchone()[0]
        print(f"📊 Energy consumption records: {energy_count}")
        
        # Check weather records  
        cursor.execute("SELECT COUNT(*) FROM weather_data")
        weather_count = cursor.fetchone()[0]
        print(f"🌤️ Weather data records: {weather_count}")
        
        # Show recent records if any
        if energy_count > 0:
            cursor.execute("""
                SELECT region, timestamp, consumption_mwh 
                FROM energy_consumption 
                ORDER BY created_at DESC 
                LIMIT 3
            """)
            recent_energy = cursor.fetchall()
            print("\n📈 Recent energy records:")
            for record in recent_energy:
                print(f"   {record[0]}: {record[2]} MWh at {record[1]}")
        
        if weather_count > 0:
            cursor.execute("""
                SELECT region, timestamp, temperature 
                FROM weather_data 
                ORDER BY created_at DESC 
                LIMIT 3
            """)
            recent_weather = cursor.fetchall()
            print("\n🌡️ Recent weather records:")
            for record in recent_weather:
                print(f"   {record[0]}: {record[2]}°F at {record[1]}")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        print("💡 Make sure Docker containers are running: docker-compose ps")

def run_test_pipelines():
    """Test running data pipelines"""
    print("\n🚀 Testing Data Pipeline Execution")
    print("=" * 40)
    
    # Test energy pipeline
    try:
        print("⚡ Triggering energy pipeline...")
        response = requests.post(
            "http://localhost:8000/api/v1/pipeline/run-energy-ingestion?regions=CAL&days_back=2",
            timeout=10
        )
        if response.status_code == 200:
            print("✅ Energy pipeline triggered successfully")
            print("   ⏳ Pipeline running in background...")
        else:
            print(f"❌ Energy pipeline failed: HTTP {response.status_code}")
            print(f"   Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Energy pipeline error: {e}")
    
    # Test weather pipeline
    try:
        print("\n🌤️ Triggering weather pipeline...")
        response = requests.post(
            "http://localhost:8000/api/v1/pipeline/run-weather-ingestion?cities=Boston",
            timeout=10
        )
        if response.status_code == 200:
            print("✅ Weather pipeline triggered successfully")
            print("   ⏳ Pipeline running in background...")
        else:
            print(f"❌ Weather pipeline failed: HTTP {response.status_code}")
            print(f"   Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Weather pipeline error: {e}")

if __name__ == "__main__":
    print("🧪 Energy Pipeline Data Debug Tool")
    print("🕐 " + datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    print("=" * 50)
    
    # Run all checks
    check_backend_api()
    check_database_direct()
    
    # Ask if user wants to run pipelines
    print("\n" + "=" * 50)
    print("💡 If you see 0 records above, you need to run data pipelines!")
    print("🔧 This will populate your database with energy and weather data.")
    
    user_input = input("\n❓ Do you want to run test pipelines now? (y/n): ").lower().strip()
    
    if user_input == 'y' or user_input == 'yes':
        run_test_pipelines()
        print("\n⏳ Pipelines are running in background...")
        print("🔄 Wait 30-60 seconds, then check your frontend dashboard!")
        print("📊 Go to Analytics tab to see charts with data")
    else:
        print("\n💡 To run pipelines manually:")
        print("   1. Visit http://localhost:3000")
        print("   2. Go to Overview tab") 
        print("   3. Click 'Run Energy Pipeline' and 'Run Weather Pipeline'")
        print("   4. Wait 30-60 seconds")
        print("   5. Check Analytics tab for data")
    
    print("\n🎯 Next: Check your browser console (F12) for any JavaScript errors")
    input("Press Enter to close...")
