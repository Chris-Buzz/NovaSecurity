#!/usr/bin/env python3
"""Test script to verify all scenarios have gender field"""

from app import CALL_SCENARIOS

print("Scenarios with gender field:")
print("="*70)

total = len(CALL_SCENARIOS)
with_gender = 0

for scenario in CALL_SCENARIOS:
    has_gender = 'gender' in scenario
    if has_gender:
        with_gender += 1
        status = "✓"
        gender = scenario['gender']
    else:
        status = "✗"
        gender = "MISSING"
    
    caller = scenario.get('caller_name', 'Unknown')
    sid = scenario.get('id', 'Unknown')
    print(f"{status} {sid:30} | gender: {gender:6} | {caller}")

print()
print(f"Total scenarios: {total}")
print(f"Scenarios with gender: {with_gender}")
print(f"Coverage: {100*with_gender//total}%")
