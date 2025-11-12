"""
WSGI entry point for production deployment on Vercel
This file is the entry point that Vercel uses to start the Flask application
"""
import os
import sys

# Add the app directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from app import app
    
    # Vercel will call this function
    handler = app
        
except Exception as e:
    print(f"Error loading app: {e}")
    import traceback
    traceback.print_exc()
    raise


