"""
DevShare Extensions

Initialize all third-party extensions here.
"""

from flask_pymongo import PyMongo
from flask_jwt_extended import JWTManager
from flask_restx import Api
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import os

# MongoDB extension
mongo = PyMongo()

# JWT extension for authentication
jwt = JWTManager()

# Flask-RESTX extension for API
api = Api(
    title="DevShare",
    description="Social Platform for Developers",
    doc="/api/swagger-ui/",
    prefix="/api",
    version="1.0.0"
)

# Get Redis URL from environment, fallback to in-memory for development
redis_url = os.getenv("RATELIMIT_STORAGE_URL", "memory://")

# Rate limiter extension
limiter = Limiter(
    key_func=get_remote_address,   # Identifies client by IP
    storage_uri=redis_url,         # Redis storage for rate limiting
    default_limits=["200 per day", "50 per hour"],  # Fallback limits
    swallow_errors=True            # Don't fail if Redis is unavailable
)
