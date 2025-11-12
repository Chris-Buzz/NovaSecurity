"""
Minimal WSGI handler for Vercel - this is what Vercel actually uses
"""
from app import app

# This is the entry point Vercel uses
def handler(request, context):
    return app(request, context)
