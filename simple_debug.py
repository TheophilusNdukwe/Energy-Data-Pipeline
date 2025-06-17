#!/usr/bin/env python3
"""
Simplified Energy Pipeline Debug Tool - No external dependencies required
Tests the system without needing psycopg2 or other database libraries
"""

import requests
import subprocess
import sys
import os
import json
from datetime import datetime

class SimpleDebugger:
    def __init__(self):
        self.backend_url = "http://localhost:8000"
        self.frontend_url = "http://localhost:3000"
        self.issues = []
        self.suggestions = []
    
    def print_section(self, title):
        print(f"\n{'='*50}")
        print(f"🔍 {title}")
        print(f"{'='*50}")
    
    def print_result(self, test_name, success, details=""):
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   📝 {details}")
        if not success:
            self.issues.append(f"{test_name}: {details}")
    
    def test_backend_services(self):
        """Test if backend services are running"""
        self.print_section("BACKEND SERVICES")
        
        # Test Docker
        try:
            result = subprocess.run(['docker', '--version'], 
                                  capture_output=True, text=True, timeout=5)
            docker_available = result.returncode == 0
            self.print_result("Docker Available", docker_available, 
                            result.stdout.strip() if docker_available else "Docker not found")
            
            if docker_available:
                # Check containers
                result = subprocess.run(['docker-compose', 'ps'], 
                                      capture_output=True, text=True, timeout=10)
                if result.returncode == 0:
                    containers_running = "Up" in result.stdout
                    self.print_result("Backend Containers", containers_running,
                                    "Containers are running" if containers_running else "Containers stopped")
                    if not containers_running:
                        self.suggestions.append("Start backend: docker-compose up -d")
                else:
                    self.print_result("Docker Compose", False, "Failed to check containers")
                    self.suggestions.append("Check if you're in the right directory")
        except:
            self.print_result("Docker Services", False, "Docker not available")
            self.suggestions.append("Install Docker Desktop and make sure it's running")
    
    def test_api_endpoints(self):
        """Test all API endpoints"""
        self.print_section("API ENDPOINTS")
        
        endpoints = [
            ("Health Check", f"{self.backend_url}/health"),
            ("Energy Data", f"{self.backend_url}/api/v1/energy/consumption?limit=3"),
            ("Energy Summary", f"{self.backend_url}/api/v1/energy/summary"),
            ("Weather Data", f"{self.backend_url}/api/v1/weather/current"),
            ("Pipeline Status", f"{self.backend_url}/api/v1/status")
        ]
        
        backend_working = False
        
        for name, url in endpoints:
            try:
                response = requests.get(url, timeout=5)
                success = response.status_code == 200
                
                if success:
                    backend_working = True
                    try:
                        data = response.json()
                        
                        # Show useful info
                        info = ""
                        if 'count' in data:
                            count = data['count']
                            info = f"{count} records available"
                            if count == 0 and 'energy' in name.lower():
                                self.suggestions.append("No energy data - run energy pipeline")
                            elif count == 0 and 'weather' in name.lower():
                                self.suggestions.append("No weather data - run weather pipeline")
                        elif 'summary' in data:
                            total = data['summary'].get('total_records', 0)
                            info = f"Summary: {total} total records"
                            if total == 0:
                                self.suggestions.append("Database is empty - run data pipelines")
                        elif 'status' in data:
                            info = f"Status: {data['status']}"
                        elif 'data_status' in data:
                            energy_records = data['data_status'].get('energy_records_last_30_days', 0)
                            weather_records = data['data_status'].get('weather_records_available', 0)
                            info = f"Energy: {energy_records}, Weather: {weather_records}"
                            if energy_records == 0 and weather_records == 0:
                                self.suggestions.append("No data found - run both pipelines")
                        
                        self.print_result(name, True, info)
                        
                    except json.JSONDecodeError:
                        self.print_result(name, True, "Response received (not JSON)")
                else:
                    self.print_result(name, False, f"HTTP {response.status_code}")
                    
            except requests.exceptions.ConnectionError:
                self.print_result(name, False, "Connection refused")
                if not backend_working:
                    self.suggestions.append("Backend not running - start with: docker-compose up -d")
            except requests.exceptions.Timeout:
                self.print_result(name, False, "Request timeout")
            except Exception as e:
                self.print_result(name, False, f"Error: {e}")
    
    def test_frontend(self):
        """Test frontend setup"""
        self.print_section("FRONTEND")
        
        # Check Node.js
        try:
            result = subprocess.run(['node', '--version'], 
                                  capture_output=True, text=True, timeout=5)
            node_available = result.returncode == 0
            version = result.stdout.strip() if node_available else "Not found"
            self.print_result("Node.js", node_available, f"Version: {version}")
            
            if not node_available:
                self.suggestions.append("Install Node.js from https://nodejs.org")
        except:
            self.print_result("Node.js", False, "Not installed")
            self.suggestions.append("Install Node.js from https://nodejs.org")
        
        # Check frontend directory
        frontend_dir = "frontend/project"
        if os.path.exists(frontend_dir):
            self.print_result("Frontend Directory", True, f"Found: {frontend_dir}")
            
            # Check package.json
            package_json = os.path.join(frontend_dir, "package.json")
            if os.path.exists(package_json):
                self.print_result("package.json", True, "Configuration file exists")
                
                # Check node_modules
                node_modules = os.path.join(frontend_dir, "node_modules")
                deps_installed = os.path.exists(node_modules)
                self.print_result("Dependencies", deps_installed, 
                                "Installed" if deps_installed else "Missing")
                
                if not deps_installed:
                    self.suggestions.append(f"Install dependencies: cd {frontend_dir} && npm install")
            else:
                self.print_result("package.json", False, "Configuration missing")
        else:
            self.print_result("Frontend Directory", False, f"Not found: {frontend_dir}")
            self.suggestions.append("Frontend files missing - check project structure")
        
        # Test if frontend is running
        try:
            response = requests.get(self.frontend_url, timeout=3)
            frontend_running = response.status_code == 200
            self.print_result("Frontend Server", frontend_running, 
                            f"Running on {self.frontend_url}" if frontend_running else "Not running")
            
            if not frontend_running:
                self.suggestions.append(f"Start frontend: cd {frontend_dir} && npm run dev")
                
        except requests.exceptions.ConnectionError:
            self.print_result("Frontend Server", False, "Not running")
            self.suggestions.append(f"Start frontend: cd {frontend_dir} && npm run dev")
        except Exception as e:
            self.print_result("Frontend Server", False, f"Error: {e}")
    
    def test_configuration(self):
        """Test configuration files"""
        self.print_section("CONFIGURATION")
        
        # Check .env file
        if os.path.exists(".env"):
            self.print_result(".env File", True, "Configuration file exists")
            
            try:
                with open(".env", "r") as f:
                    content = f.read()
                
                # Check API keys
                eia_configured = "EIA_API_KEY=" in content and len(content.split("EIA_API_KEY=")[1].split()[0]) > 10
                weather_configured = "OPENWEATHER_API_KEY=" in content and len(content.split("OPENWEATHER_API_KEY=")[1].split()[0]) > 10
                
                self.print_result("EIA API Key", eia_configured, 
                                "Configured" if eia_configured else "Missing or invalid")
                self.print_result("Weather API Key", weather_configured, 
                                "Configured" if weather_configured else "Missing or invalid")
                
                if not eia_configured:
                    self.suggestions.append("Add valid EIA_API_KEY to .env file")
                if not weather_configured:
                    self.suggestions.append("Add valid OPENWEATHER_API_KEY to .env file")
                    
            except Exception as e:
                self.print_result("API Keys", False, f"Error reading .env: {e}")
        else:
            self.print_result(".env File", False, "Missing")
            self.suggestions.append("Create .env file with API keys")
    
    def test_pipeline_triggers(self):
        """Test if we can trigger pipelines"""
        self.print_section("PIPELINE TESTING")
        
        print("🧪 Testing pipeline triggers (won't actually run full pipelines)...")
        
        # Test energy pipeline trigger
        try:
            # Just test the endpoint exists, don't actually run it
            response = requests.post(
                f"{self.backend_url}/api/v1/pipeline/run-energy-ingestion?regions=CAL&days_back=1",
                timeout=5
            )
            
            if response.status_code == 200:
                self.print_result("Energy Pipeline Trigger", True, "Endpoint working")
            elif response.status_code == 400:
                # Might be API key issue
                try:
                    error_data = response.json()
                    if "API key" in error_data.get('detail', ''):
                        self.print_result("Energy Pipeline Trigger", False, "API key not configured")
                        self.suggestions.append("Configure EIA_API_KEY in .env file")
                    else:
                        self.print_result("Energy Pipeline Trigger", False, error_data.get('detail', 'Unknown error'))
                except:
                    self.print_result("Energy Pipeline Trigger", False, f"HTTP {response.status_code}")
            else:
                self.print_result("Energy Pipeline Trigger", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.print_result("Energy Pipeline Trigger", False, f"Error: {e}")
        
        # Test weather pipeline trigger
        try:
            response = requests.post(
                f"{self.backend_url}/api/v1/pipeline/run-weather-ingestion?cities=Boston",
                timeout=5
            )
            
            if response.status_code == 200:
                self.print_result("Weather Pipeline Trigger", True, "Endpoint working")
            elif response.status_code == 400:
                try:
                    error_data = response.json()
                    if "API key" in error_data.get('detail', ''):
                        self.print_result("Weather Pipeline Trigger", False, "API key not configured")
                        self.suggestions.append("Configure OPENWEATHER_API_KEY in .env file")
                    else:
                        self.print_result("Weather Pipeline Trigger", False, error_data.get('detail', 'Unknown error'))
                except:
                    self.print_result("Weather Pipeline Trigger", False, f"HTTP {response.status_code}")
            else:
                self.print_result("Weather Pipeline Trigger", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.print_result("Weather Pipeline Trigger", False, f"Error: {e}")
    
    def generate_summary(self):
        """Generate final summary"""
        self.print_section("SUMMARY & NEXT STEPS")
        
        print("📊 ISSUES FOUND:")
        if self.issues:
            for i, issue in enumerate(self.issues, 1):
                print(f"   {i}. {issue}")
        else:
            print("   ✅ No major issues detected!")
        
        print(f"\n🔧 RECOMMENDED ACTIONS:")
        if self.suggestions:
            for i, suggestion in enumerate(self.suggestions, 1):
                print(f"   {i}. {suggestion}")
        else:
            print("   🎉 System looks good! Try using the dashboard.")
        
        print(f"\n🎯 QUICK TEST STEPS:")
        print(f"   1. Visit {self.frontend_url}")
        print(f"   2. Check connection banner (should be green)")
        print(f"   3. Go to Overview tab")
        print(f"   4. Click 'Run Energy Pipeline' and 'Run Weather Pipeline'")
        print(f"   5. Wait 30-60 seconds")
        print(f"   6. Go to Analytics tab to see charts")
        
        print(f"\n🔍 IF FRONTEND SHOWS NO DATA:")
        print(f"   • Check browser console (F12) for JavaScript errors")
        print(f"   • Make sure you ran the data pipelines first")
        print(f"   • Wait 1-2 minutes after running pipelines")
        print(f"   • Try refreshing the page")

def main():
    print("🧪 SIMPLIFIED ENERGY PIPELINE DEBUG TOOL")
    print(f"🕐 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("📝 This version doesn't require database libraries")
    
    debugger = SimpleDebugger()
    
    # Run all tests
    debugger.test_backend_services()
    debugger.test_api_endpoints()
    debugger.test_frontend()
    debugger.test_configuration()
    
    # Ask about pipeline testing
    print(f"\n" + "="*50)
    user_input = input("🤔 Test pipeline triggers? (y/n): ").lower().strip()
    
    if user_input in ['y', 'yes']:
        debugger.test_pipeline_triggers()
    
    # Generate summary
    debugger.generate_summary()
    
    input(f"\nPress Enter to close...")

if __name__ == "__main__":
    main()
