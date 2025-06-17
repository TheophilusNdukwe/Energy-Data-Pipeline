# check_api_endpoints.py - Check what endpoints are available
import requests
import json

BASE_URL = "http://localhost:8000"

def check_api_endpoints():
    """Check what API endpoints are available"""
    print("🔍 Checking Available API Endpoints...")
    print("=" * 50)
    
    # Test basic endpoints
    endpoints_to_test = [
        # Basic endpoints
        ("GET", "/", "Root endpoint"),
        ("GET", "/health", "Health check"),
        ("GET", "/docs", "API documentation"),
        
        # Existing endpoints  
        ("GET", "/api/v1/status", "Pipeline status"),
        ("GET", "/api/v1/energy/consumption?limit=5", "Energy data"),
        
        # NEW Quality endpoints
        ("GET", "/api/v1/quality/dashboard", "Quality dashboard"),
        ("GET", "/api/v1/quality/metrics", "Quality metrics"),
        ("GET", "/api/v1/quality/summary", "Quality summary"),
        ("GET", "/api/v1/quality/issues", "Quality issues"),
        ("POST", "/api/v1/quality/run-check", "Manual quality check"),
        ("GET", "/api/v1/quality/monitoring/status", "Monitoring status"),
        ("POST", "/api/v1/quality/monitoring/immediate-check", "Immediate check"),
    ]
    
    available_endpoints = []
    missing_endpoints = []
    
    for method, endpoint, description in endpoints_to_test:
        try:
            if method == "GET":
                response = requests.get(f"{BASE_URL}{endpoint}", timeout=5)
            elif method == "POST":
                response = requests.post(f"{BASE_URL}{endpoint}", timeout=5)
            
            if response.status_code == 404:
                missing_endpoints.append((method, endpoint, description))
                print(f"❌ {method} {endpoint} - {description} (404 NOT FOUND)")
            elif response.status_code < 500:
                available_endpoints.append((method, endpoint, description, response.status_code))
                print(f"✅ {method} {endpoint} - {description} ({response.status_code})")
            else:
                print(f"⚠️ {method} {endpoint} - {description} ({response.status_code} SERVER ERROR)")
                
        except requests.exceptions.RequestException as e:
            print(f"❌ {method} {endpoint} - {description} (CONNECTION ERROR)")
    
    print(f"\n" + "=" * 50)
    print(f"📊 Endpoint Summary:")
    print(f"✅ Available: {len(available_endpoints)}")
    print(f"❌ Missing: {len(missing_endpoints)}")
    
    if missing_endpoints:
        print(f"\n🚨 Missing Quality Endpoints:")
        for method, endpoint, description in missing_endpoints:
            print(f"   • {method} {endpoint} - {description}")
        
        print(f"\n🔧 This means the backend is running the OLD version.")
        print(f"📋 To fix:")
        print(f"   1. Stop backend: docker-compose down")
        print(f"   2. Rebuild: docker-compose up --build -d") 
        print(f"   3. Check logs: docker-compose logs -f api")
        print(f"   4. Verify new endpoints load")
    
    else:
        print(f"\n🎉 All quality endpoints are available!")
        print(f"✅ Quality system is loaded and ready!")
        
    # Check if we can access the API docs
    try:
        docs_response = requests.get(f"{BASE_URL}/docs")
        if docs_response.status_code == 200:
            print(f"\n📚 API Documentation: {BASE_URL}/docs")
            print(f"   👆 Visit this URL to see all available endpoints")
    except:
        pass

if __name__ == "__main__":
    check_api_endpoints()