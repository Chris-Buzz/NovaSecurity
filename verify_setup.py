#!/usr/bin/env python3
"""
Nova Security - Startup Verification Script
Checks all components are properly configured before running
"""

import os
import sys
from pathlib import Path

def check_dependencies():
    """Verify all Python dependencies are installed"""
    print("📦 Checking dependencies...")
    required_packages = [
        'flask',
        'flask_cors',
        'python-dotenv',
        'google-generativeai',
        'requests'
    ]
    
    missing = []
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
            print(f"  ✅ {package}")
        except ImportError:
            print(f"  ❌ {package} - MISSING")
            missing.append(package)
    
    return len(missing) == 0

def check_files():
    """Verify all required files exist"""
    print("\n📁 Checking files...")
    required_files = [
        'app.py',
        'requirements.txt',
        'static/js/script.js',
        'static/css/styles.css',
        'templates/index.html'
    ]
    
    all_exist = True
    for file in required_files:
        if Path(file).exists():
            print(f"  ✅ {file}")
        else:
            print(f"  ❌ {file} - MISSING")
            all_exist = False
    
    return all_exist

def check_env_vars():
    """Check if API keys are configured"""
    print("\n🔑 Checking environment variables...")
    
    elevenlabs_key = os.getenv('ELEVENLABS_API_KEY')
    gemini_key = os.getenv('GEMINI_API_KEY')
    
    if elevenlabs_key:
        print(f"  ✅ ELEVENLABS_API_KEY configured")
    else:
        print(f"  ⚠️  ELEVENLABS_API_KEY not set (will use default)")
    
    if gemini_key:
        print(f"  ✅ GEMINI_API_KEY configured")
    else:
        print(f"  ⚠️  GEMINI_API_KEY not set (AI responses may not work)")
    
    return True

def check_scenarios():
    """Verify scenario data is loaded"""
    print("\n🎮 Checking scenario data...")
    try:
        # Import app module
        sys.path.insert(0, '.')
        from app import CALL_SCENARIOS, PHISHING_LEVELS, PASSWORD_LEVELS
        
        print(f"  ✅ Phone call scenarios: {len(CALL_SCENARIOS)} loaded")
        print(f"  ✅ Phishing scenarios: {len(PHISHING_LEVELS)} loaded")
        print(f"  ✅ Password scenarios: {len(PASSWORD_LEVELS)} loaded")
        
        return True
    except Exception as e:
        print(f"  ❌ Error loading scenarios: {e}")
        return False

def main():
    """Run all checks"""
    print("=" * 50)
    print("Nova Security - Startup Verification")
    print("=" * 50)
    
    checks = [
        ("Dependencies", check_dependencies()),
        ("Files", check_files()),
        ("Environment", check_env_vars()),
        ("Scenarios", check_scenarios())
    ]
    
    print("\n" + "=" * 50)
    print("📊 VERIFICATION SUMMARY")
    print("=" * 50)
    
    all_passed = True
    for name, result in checks:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {name}")
        if not result:
            all_passed = False
    
    print("\n" + "=" * 50)
    if all_passed:
        print("✅ All checks passed! App is ready to run.")
        print("\nStart the app with: python app.py")
        print("Then open: http://localhost:5000")
    else:
        print("❌ Some checks failed. Please fix the issues above.")
        print("\nTo install dependencies: pip install -r requirements.txt")
    print("=" * 50)
    
    return 0 if all_passed else 1

if __name__ == '__main__':
    sys.exit(main())
