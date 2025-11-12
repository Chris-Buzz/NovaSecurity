"""
WSGI entry point for production deployment on Vercel
"""
from app import app

# Vercel will call this function
handler = app
