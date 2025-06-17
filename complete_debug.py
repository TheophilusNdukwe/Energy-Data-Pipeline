#!/usr/bin/env python3
"""
Complete Energy Pipeline Debug Tool
Tests every component from backend to frontend to identify issues
"""

import requests
import json
import subprocess
import sys
import time
import os
from datetime import datetime
import psycopg2

class EnergyPipelineDebugger:
    def __init__(self):
        self.backend_url = "http://localhost:8000"
        self.frontend_url = "http://localhost:3000"
        self.results = {
            "backend": {"status": "unknown", "details": {}},
            "database": {"status": "unknown", "details": {}},
            "api_endpoints": {"status": "unknown", "details": {}},
            "frontend": {"status": "unknown", "details": {}},
            "data": {"status": "unknown", "details": {}},
            "suggestions": []
        }
    
    def print_section(self, title):
        print(f"\n{'='*60}")
        print(f"🔍 {title}")
        print(f"{'='*60}")
    
    def print_result(self, test_name, success, details=""):
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   📝 {details}")
    
    def test_docker_services(self):
        """Test if Docker services are running"""
        self.print_section("DOCKER SERVICES")
        
        try:
            # Check if docker-compose is available
            result = subprocess.run(['docker-compose', '--version'], 
                                  capture_output=True, text=True, timeout=10)
            self.print_result("Docker Compose Available", result.returncode == 0)
            
            # Check running containers
            result = subprocess.run(['docker-compose', 'ps'], 
                                  capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0:
                output = result.stdout
                containers_up = "Up" in output
                self.print_result("Backend Containers Running", containers_up, 
                                f"Container status: {'Running' if containers_up else 'Stopped'}")
                
                if not containers_up:
                    self.results["suggestions"].append("Start backend: docker-compose up -d")
                    
                self.results["backend"]["status"] = "running" if containers_up else "stopped"
                self.results["backend"]["details"]["containers"] = output
            else:
                self.print_result("Docker Compose Status", False, "Failed to check containers")
                self.results["backend"]["status"] = "error"
                
        except subprocess.TimeoutExpired:
            self.print_result("Docker Services", False, "Command timed out")
        except FileNotFoundError:
            self.print_result("Docker Services", False, "Docker not found")
            self.results["suggestions"].append("Install Docker Desktop")
    
    def test_database_connection(self):
        """Test PostgreSQL database connection"""
        self.print_section("DATABASE CONNECTION")
        
        try:
            conn = psycopg2.connect(
                host="localhost",
                port="5432",
                database="energy_pipeline",
                user="postgres",
                password="password123",
                connect_timeout=5
            )
            
            cursor = conn.cursor()
            self.print_result("Database Connection", True, "PostgreSQL connected successfully")
            
            # Check table existence
            cursor.execute("""
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public'
            """)
            tables = [row[0] for row in cursor.fetchall()]
            
            expected_tables = ['energy_consumption', 'weather_data', 'data_quality_logs', 'pipeline_runs']
            missing_tables = [table for table in expected_tables if table not in tables]
            
            self.print_result("Database Tables", len(missing_tables) == 0, 
                            f"Tables: {tables}, Missing: {missing_tables}")
            
            # Check data counts
            cursor.execute("SELECT COUNT(*) FROM energy_consumption")
            energy_count = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM weather_data")
            weather_count = cursor.fetchone()[0]
            
            self.print_result("Energy Data Records", energy_count > 0, 
                            f"{energy_count} records in energy_consumption")
            self.print_result("Weather Data Records", weather_count > 0, 
                            f"{weather_count} records in weather_data")
            
            self.results["database"]["status"] = "connected"
            self.results["database"]["details"] = {
                "tables": tables,
                "energy_records": energy_count,
                "weather_records": weather_count
            }
            
            if energy_count == 0:
                self.results["suggestions"].append("Run energy pipeline to populate data")
            if weather_count == 0:
                self.results["suggestions"].append("Run weather pipeline to populate data")
            
            cursor.close()
            conn.close()
            
        except psycopg2.OperationalError as e:
            self.print_result("Database Connection", False, f"Connection failed: {e}")
            self.results["database"]["status"] = "disconnected"
            self.results["suggestions"].append("Check if PostgreSQL container is running")
        except Exception as e:
            self.print_result("Database Connection", False, f"Error: {e}")
            self.results["database"]["status"] = "error"
    
    def test_backend_api(self):
        """Test all backend API endpoints"""
        self.print_section("BACKEND API ENDPOINTS")
        
        endpoints = [
            ("Health Check", f"{self.backend_url}/health"),
            ("Energy Consumption", f"{self.backend_url}/api/v1/energy/consumption?limit=5"),
            ("Energy Summary", f"{self.backend_url}/api/v1/energy/summary"),
            ("Weather Data", f"{self.backend_url}/api/v1/weather/current"),
            ("Pipeline Status", f"{self.backend_url}/api/v1/status")
        ]
        
        api_working = True
        for name, url in endpoints:
            try:
                response = requests.get(url, timeout=5)
                success = response.status_code == 200
                
                if success:
                    data = response.json()
                    
                    # Extract useful info
                    info = ""
                    if 'count' in data:
                        info = f"Records: {data['count']}"
                    elif 'data_status' in data:
                        energy_records = data['data_status'].get('energy_records_last_30_days', 0)
                        weather_records = data['data_status'].get('weather_records_available', 0)
                        info = f"Energy: {energy_records}, Weather: {weather_records}"
                    elif 'status' in data:
                        info = f"Status: {data['status']}"
                    
                    self.print_result(name, True, info)
                else:
                    self.print_result(name, False, f"HTTP {response.status_code}")
                    api_working = False
                    
            except requests.exceptions.ConnectionError:
                self.print_result(name, False, "Connection refused")
                api_working = False
            except requests.exceptions.Timeout:
                self.print_result(name, False, "Request timeout")
                api_working = False
            except Exception as e:
                self.print_result(name, False, f"Error: {e}")
                api_working = False
        
        self.results["api_endpoints"]["status"] = "working" if api_working else "failing"
        
        if not api_working:
            self.results["suggestions"].append("Restart backend: docker-compose restart api")
    
    def test_frontend_setup(self):
        """Test frontend configuration and setup"""
        self.print_section("FRONTEND SETUP")
        
        frontend_dir = "frontend/project"
        
        # Check if Node.js is available
        try:
            result = subprocess.run(['node', '--version'], 
                                  capture_output=True, text=True, timeout=5)
            node_version = result.stdout.strip() if result.returncode == 0 else "Not found"
            self.print_result("Node.js", result.returncode == 0, f"Version: {node_version}")
        except:
            self.print_result("Node.js", False, "Not installed")
            self.results["suggestions"].append("Install Node.js from https://nodejs.org")
        
        # Check if frontend directory exists
        frontend_exists = os.path.exists(frontend_dir)
        self.print_result("Frontend Directory", frontend_exists, f"Path: {frontend_dir}")
        
        if frontend_exists:
            # Check package.json
            package_json_exists = os.path.exists(f"{frontend_dir}/package.json")
            self.print_result("package.json", package_json_exists)
            
            # Check node_modules
            node_modules_exists = os.path.exists(f"{frontend_dir}/node_modules")
            self.print_result("Dependencies Installed", node_modules_exists)
            
            if not node_modules_exists:
                self.results["suggestions"].append(f"Install dependencies: cd {frontend_dir} && npm install")
            
            # Check if frontend is running
            try:
                response = requests.get(self.frontend_url, timeout=3)
                frontend_running = response.status_code == 200
                self.print_result("Frontend Server", frontend_running, 
                                f"Available at {self.frontend_url}")
                
                if not frontend_running:
                    self.results["suggestions"].append(f"Start frontend: cd {frontend_dir} && npm run dev")
                    
            except requests.exceptions.ConnectionError:
                self.print_result("Frontend Server", False, "Not running")
                self.results["suggestions"].append(f"Start frontend: cd {frontend_dir} && npm run dev")
            except Exception as e:
                self.print_result("Frontend Server", False, f"Error: {e}")
        
        self.results["frontend"]["status"] = "configured" if frontend_exists else "missing"
    
    def test_api_keys(self):
        """Test API key configuration"""
        self.print_section("API KEYS CONFIGURATION")
        
        # Check .env file
        env_file_exists = os.path.exists(".env")
        self.print_result(".env File", env_file_exists)
        
        if env_file_exists:
            try:
                with open(".env", "r") as f:
                    env_content = f.read()
                
                eia_configured = "EIA_API_KEY=" in env_content and "dummy_key" not in env_content
                weather_configured = "OPENWEATHER_API_KEY=" in env_content and "dummy_key" not in env_content
                
                self.print_result("EIA API Key", eia_configured)
                self.print_result("OpenWeather API Key", weather_configured)
                
                if not eia_configured:
                    self.results["suggestions"].append("Configure EIA API key in .env file")
                if not weather_configured:
                    self.results["suggestions"].append("Configure OpenWeather API key in .env file")
                    
            except Exception as e:
                self.print_result("API Keys", False, f"Error reading .env: {e}")
        else:
            self.results["suggestions"].append("Create .env file with API keys")
    
    def test_data_pipelines(self):
        """Test running data pipelines"""
        self.print_section("DATA PIPELINE TESTING")
        
        # Test energy pipeline
        try:
            print("🚀 Testing energy pipeline...")
            response = requests.post(
                f"{self.backend_url}/api/v1/pipeline/run-energy-ingestion?regions=CAL&days_back=1",
                timeout=10
            )
            
            pipeline_success = response.status_code == 200
            self.print_result("Energy Pipeline Trigger", pipeline_success, 
                            f"HTTP {response.status_code}")
            
            if pipeline_success:
                print("   ⏳ Pipeline running in background... (will take 30-60 seconds)")
            
        except Exception as e:
            self.print_result("Energy Pipeline", False, f"Error: {e}")
        
        # Test weather pipeline
        try:
            print("🌤️ Testing weather pipeline...")
            response = requests.post(
                f"{self.backend_url}/api/v1/pipeline/run-weather-ingestion?cities=Boston",
                timeout=10
            )
            
            pipeline_success = response.status_code == 200
            self.print_result("Weather Pipeline Trigger", pipeline_success, 
                            f"HTTP {response.status_code}")
            
            if pipeline_success:
                print("   ⏳ Pipeline running in background... (will take 10-30 seconds)")
                
        except Exception as e:
            self.print_result("Weather Pipeline", False, f"Error: {e}")
    
    def generate_report(self):
        """Generate final debug report"""
        self.print_section("DEBUG SUMMARY & RECOMMENDATIONS")
        
        print("📊 SYSTEM STATUS:")
        print(f"   Backend: {self.results['backend']['status']}")
        print(f"   Database: {self.results['database']['status']}")
        print(f"   API Endpoints: {self.results['api_endpoints']['status']}")
        print(f"   Frontend: {self.results['frontend']['status']}")
        
        if 'energy_records' in self.results['database'].get('details', {}):
            energy_count = self.results['database']['details']['energy_records']
            weather_count = self.results['database']['details']['weather_records']
            print(f"   Data: {energy_count} energy + {weather_count} weather records")
        
        if self.results["suggestions"]:
            print(f"\n🔧 RECOMMENDED FIXES:")
            for i, suggestion in enumerate(self.results["suggestions"], 1):
                print(f"   {i}. {suggestion}")
        
        # Determine overall status
        backend_ok = self.results['backend']['status'] in ['running']
        db_ok = self.results['database']['status'] in ['connected']
        api_ok = self.results['api_endpoints']['status'] in ['working']
        
        if backend_ok and db_ok and api_ok:
            print(f"\n🎉 DIAGNOSIS: System is mostly working!")
            print(f"   If frontend shows no data, run the data pipelines from the dashboard.")
            print(f"   Visit {self.frontend_url} and click 'Run Energy Pipeline' and 'Run Weather Pipeline'")
        else:
            print(f"\n⚠️ DIAGNOSIS: Found issues that need fixing.")
            print(f"   Focus on the failed tests above and follow the recommended fixes.")
        
        print(f"\n📖 Next Steps:")
        print(f"   1. Fix any failed tests above")
        print(f"   2. Visit {self.frontend_url}")
        print(f"   3. Check browser console (F12) for JavaScript errors")
        print(f"   4. Run data pipelines from Overview tab")
        print(f"   5. Check Analytics tab for charts")

def main():
    print("🧪 ENERGY PIPELINE COMPLETE DEBUG TOOL")
    print(f"🕐 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    debugger = EnergyPipelineDebugger()
    
    # Run all tests
    debugger.test_docker_services()
    debugger.test_database_connection()
    debugger.test_backend_api()
    debugger.test_frontend_setup()
    debugger.test_api_keys()
    
    # Ask about running pipelines
    print(f"\n" + "="*60)
    user_input = input("🤔 Do you want to test data pipelines? (y/n): ").lower().strip()
    
    if user_input in ['y', 'yes']:
        debugger.test_data_pipelines()
    
    # Generate final report
    debugger.generate_report()
    
    input(f"\nPress Enter to close...")

if __name__ == "__main__":
    main()
