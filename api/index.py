# Vercel serverless entry point. Vercel only looks for Python functions in
# api/, so this exposes the Flask app that lives in backend/app.py.
# vercel.json rewrites every /api/* request here; Flask still sees the
# original path (e.g. /api/login) and routes it as usual.
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app import app  # noqa: E402,F401
