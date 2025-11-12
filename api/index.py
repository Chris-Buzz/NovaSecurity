"""
Vercel serverless function handler for Flask app
"""
import sys
import os

# Add parent directory to path so we can import app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app

# Export the Flask app directly - Vercel will handle the WSGI wrapping
app = app
