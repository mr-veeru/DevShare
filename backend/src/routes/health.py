"""
Health Check Routes

Industry-standard health check endpoints for monitoring and load balancers.
Implements liveness and readiness checks following Kubernetes best practices.
"""

from datetime import datetime, timezone
import sys
from flask import current_app as app
from flask_restx import Namespace, Resource, fields
from src.extensions import mongo
from src.logger import logger
import redis
import os

# Namespace
health_ns = Namespace("health", description="Health check operations")

# Response models for Swagger documentation
health_check_model = health_ns.model('HealthCheck', {
    'status': fields.String(description='Overall health status (healthy/unhealthy)'),
    'timestamp': fields.String(description='UTC timestamp of the check'),
    'service': fields.String(description='Service name'),
    'version': fields.String(description='API version'),
    'checks': fields.Raw(description='Individual component check results'),
    'system': fields.Raw(description='System information')
})


@health_ns.route("/")
class HealthStatus(Resource):
    @health_ns.marshal_with(health_check_model, code=200)
    def get(self):
        """
        Comprehensive health check endpoint.
        
        Returns detailed status of all system components including:
        - Database connectivity
        - JWT configuration
        - Flask configuration
        - System information
        
        Used by monitoring tools and load balancers.
        """
        health_status = {
            "status": "healthy",
            "timestamp": datetime.now(timezone.utc).isoformat() + "Z",
            "service": "DevShare",
            "version": "1.0.0",
            "checks": {},
            "system": {
                "python_version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
                "environment": app.config.get("FLASK_ENV", "development"),
                "debug_mode": app.config.get("DEBUG", False)
            }
        }
        
        overall_healthy = True
        
        # Check database connectivity
        try:
            mongo.db.command('ping')
            health_status["checks"]["database"] = {
                "status": "healthy",
                "message": "Database connection successful"
            }
        except Exception as e:
            logger.error(f"Database connection failed: {str(e)}")
            health_status["checks"]["database"] = {
                "status": "unhealthy",
                "message": f"Database connection failed: {str(e)}"
            }
            overall_healthy = False
        
        # Check JWT configuration
        try:
            jwt_secret = app.config.get("JWT_SECRET_KEY")
            if jwt_secret:
                health_status["checks"]["jwt"] = {
                    "status": "healthy",
                    "message": "JWT configuration valid"
                }
            else:
                health_status["checks"]["jwt"] = {
                    "status": "unhealthy",
                    "message": "JWT secret key not configured"
                }
                overall_healthy = False
        except Exception as e:
            logger.error(f"JWT configuration error: {str(e)}")
            health_status["checks"]["jwt"] = {
                "status": "unhealthy",
                "message": f"JWT configuration error: {str(e)}"
            }
            overall_healthy = False
        
        # Check Flask configuration
        try:
            secret_key = app.config.get("SECRET_KEY")
            if secret_key:
                health_status["checks"]["flask"] = {
                    "status": "healthy",
                    "message": "Flask configuration valid"
                }
            else:
                health_status["checks"]["flask"] = {
                    "status": "unhealthy",
                    "message": "Flask secret key not configured"
                }
                overall_healthy = False
        except Exception as e:
            logger.error(f"Flask configuration error: {str(e)}")
            health_status["checks"]["flask"] = {
                "status": "unhealthy",
                "message": f"Flask configuration error: {str(e)}"
            }
            overall_healthy = False
        
        # Check rate limiting storage (Redis or in-memory)
        redis_url = os.getenv("RATELIMIT_STORAGE_URL", "memory://")
        storage_type = "Memory"
        message = "Rate limiting active using Memory storage"
        
        if redis_url.startswith(("redis://", "rediss://")):
            try:
                redis.from_url(redis_url).ping()
                storage_type = "Redis"
                message = "Rate limiting active using Redis storage"
            except Exception as e:
                message = f"Rate limiting active using Memory storage (Redis unavailable: {str(e)})"
        
        health_status["checks"]["rate_limiting"] = {
            "status": "healthy",
            "message": message,
            "storage": storage_type
        }
        
        # Set overall status
        health_status["status"] = "healthy" if overall_healthy else "unhealthy"
        
        # Return appropriate status code (503 for unhealthy)
        status_code = 200 if overall_healthy else 503
        logger.info(f"Health status: {health_status['status']}")
        return health_status, status_code
