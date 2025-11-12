#!/usr/bin/env python3
"""Test API endpoints"""

import requests
import json
import time

BASE_URL = 'http://localhost:5000/api'

# Wait for server to be ready
time.sleep(2)

print("Testing /api/scammer/greeting endpoint...")
print("="*70)

for i in range(3):
    response = requests.post(f'{BASE_URL}/scammer/greeting', json={})
    data = response.json()
    
    print(f"\nTest {i+1}:")
    print(f"  Scenario ID: {data.get('scenario_id')}")
    print(f"  Caller Name: {data.get('caller_name')}")
    print(f"  Call Type: {data.get('call_type')}")
    print(f"  Difficulty: {data.get('difficulty')}")
    print(f"  Greeting: {data.get('greeting')[:80]}...")

print("\n" + "="*70)
print("✓ API test complete")
