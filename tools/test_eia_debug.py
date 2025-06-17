#!/usr/bin/env python3
"""
Debug script to test EIA API connection
Run this to see what's happening with the EIA API calls
"""

import requests
import sys
import json
from datetime import datetime, timedelta

# Your API key from .env
EIA_API_KEY = "nhu2rJPUQe7bAvNvGhdAjWXXC0d91csyEkh5kSC3"

def test_eia_api():
    """Test EIA API with different approaches"""
    
    print("🔍 Testing EIA API Connection...")
    print(f"API Key: {EIA_API_KEY[:10]}..." if EIA_API_KEY else "❌ No API Key")
    print()
    
    # Test 1: Check API key validity
    print("📋 Test 1: API Key Validation")
    try:
        response = requests.get(
            "https://api.eia.gov/v2/electricity/rto/region-data/",
            params={'api_key': EIA_API_KEY},
            timeout=10
        )
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print("✅ API Key is valid")
        else:
            print(f"❌ API Key issue: {response.text}")
            return
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return
    
    # Test 2: Get available regions/facets
    print("\n📍 Test 2: Available Regions")
    try:
        response = requests.get(
            "https://api.eia.gov/v2/electricity/rto/region-data/",
            params={'api_key': EIA_API_KEY},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"Raw response structure: {list(data.keys())}")
            
            response_data = data.get('response', {})
            print(f"Response data keys: {list(response_data.keys())}")
            
            facets = response_data.get('facets', {})
            print(f"Facets type: {type(facets)}")
            print(f"Facets content: {facets}")
            
            print("Available facets:")
            if isinstance(facets, dict):
                for key, values in facets.items():
                    print(f"  {key}: {len(values) if isinstance(values, list) else 'N/A'} options")
                    if key == 'respondent' and isinstance(values, list):
                        print(f"    Sample regions: {values[:10]}")
            elif isinstance(facets, list):
                print(f"  Facets is a list with {len(facets)} items")
                for i, item in enumerate(facets[:5]):  # Show first 5 items
                    print(f"    Item {i}: {item}")
            else:
                print(f"  Unexpected facets format: {facets}")

    except Exception as e:
        print(f"❌ Error getting facets: {e}")
        import traceback
        traceback.print_exc()
    
    # Test 3: Try to get actual data
    print("\n⚡ Test 3: Fetch Sample Data")
    
    # Calculate recent date range
    end_date = datetime.now()
    start_date = end_date - timedelta(days=2)
    
    regions_to_test = ['CAL', 'NYIS', 'CISO', 'PJM']
    
    for region in regions_to_test:
        print(f"\nTesting region: {region}")
        
        try:
            params = {
                'api_key': EIA_API_KEY,
                'frequency': 'hourly',
                'data[0]': 'value',
                'facets[respondent][]': region,
                'facets[type][]': 'D',  # D = Demand
                'start': start_date.strftime('%Y-%m-%dT%H'),
                'end': end_date.strftime('%Y-%m-%dT%H'),
                'sort[0][column]': 'period',
                'sort[0][direction]': 'desc',
                'offset': 0,
                'length': 5
            }
            
            print(f"  Request URL: https://api.eia.gov/v2/electricity/rto/region-data/data/")
            print(f"  Date range: {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}")
            
            response = requests.get(
                "https://api.eia.gov/v2/electricity/rto/region-data/data/",
                params=params,
                timeout=15
            )
            
            print(f"  Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                
                if 'response' in data and 'data' in data['response']:
                    records = data['response']['data']
                    print(f"  ✅ Found {len(records)} records")
                    
                    if records:
                        sample = records[0]
                        print(f"  Sample record: {sample}")
                        break  # Found working region
                else:
                    print(f"  ❌ No data in response: {data}")
            else:
                print(f"  ❌ Request failed: {response.text}")
                
        except Exception as e:
            print(f"  ❌ Error: {e}")
    
    # Test 4: Alternative endpoint
    print("\n🔄 Test 4: Alternative Data Endpoint")
    try:
        # Try the electricity operating data endpoint
        params = {
            'api_key': EIA_API_KEY,
            'frequency': 'hourly',
            'data[0]': 'value',
            'start': start_date.strftime('%Y-%m-%dT%H'),
            'end': end_date.strftime('%Y-%m-%dT%H'),
            'sort[0][column]': 'period',
            'sort[0][direction]': 'desc',
            'offset': 0,
            'length': 5
        }
        
        response = requests.get(
            "https://api.eia.gov/v2/electricity/operating-generator-capacity/data/",
            params=params,
            timeout=15
        )
        
        print(f"Generator capacity endpoint status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Response keys: {list(data.keys())}")
        
    except Exception as e:
        print(f"Alternative endpoint error: {e}")

if __name__ == "__main__":
    test_eia_api()
