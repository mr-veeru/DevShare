"""
DevShare - Social Platform for Developers

A production-ready Flask API for project sharing, user interactions, and notifications.

Author: Veerendra
Version: 1.0.0
"""

import os
from flask import Flask, jsonify
from flask_cors import CORS
from src.config import Config
from src.extensions import mongo, jwt, api, limiter
from src.routes import auth_ns, health_ns, posts_ns, profile_ns, feed_ns, likes_ns, comments_ns, replies_ns, notifications_ns, register_error_handlers
from src.database.indexes import initialize_database_indexes
from src.logger import logger


def validate_required_config():
    """Validate that all required environment variables are set"""
    required_vars = ["SECRET_KEY", "MONGO_URI", "JWT_SECRET_KEY"]
    missing_vars = [var for var in required_vars if not os.environ.get(var)]
    
    if missing_vars:
        error_msg = f"Missing required environment variables: {', '.join(missing_vars)}"
        logger.error(error_msg)
        raise ValueError(error_msg)


def create_app():
    """
    Create and configure the Flask application.

    Returns:
        Flask app instance
    """
    # Validate required configuration before creating app
    validate_required_config()
    
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Enable CORS for frontend (supports multiple origins for production)
    if Config.CORS_ORIGINS == ["*"]:
        # Development: Allow all origins
        CORS(app, supports_credentials=True)
    else:
        # Production: Specific origins only
        CORS(app, origins=Config.CORS_ORIGINS, supports_credentials=True)

    # Initialize extensions
    mongo.init_app(app)
    jwt.init_app(app)
    api.init_app(app)
    limiter.init_app(app)
    
    # Initialize database indexes for performance
    with app.app_context():
        initialize_database_indexes()

    # Add namespaces to API
    api.add_namespace(auth_ns, path="/auth")
    api.add_namespace(health_ns, path="/health")
    api.add_namespace(posts_ns, path="/posts")
    api.add_namespace(profile_ns, path="/profile")
    api.add_namespace(feed_ns, path="/feed")
    api.add_namespace(likes_ns, path="/social/likes")
    api.add_namespace(comments_ns, path="/social/comments")
    api.add_namespace(replies_ns, path="/social/replies")
    api.add_namespace(notifications_ns, path="/notifications")
    
    # Register global error handlers
    register_error_handlers(app)

    # Home route
    @app.route('/')
    def home():
        """Simple home endpoint"""
        return jsonify({
            "message": "DevShare is running",
            "status": "healthy",
            "version": "1.0.0",
            "endpoints": {
                "swagger": "/api/swagger-ui/",
                "auth": "/api/auth/",
                "health": "/api/health/",
                "posts": "/api/posts/",
                "profile": "/api/profile/",
                "feed": "/api/feed/",
                "social": {
                    "likes": "/api/social/likes/",
                    "comments": "/api/social/comments/",
                    "replies": "/api/social/replies/"
                },
                "notifications": "/api/notifications/"
            }
        })
    

    return app

# Create the Flask app instance
app = create_app()

if __name__ == "__main__":
    # Run server (debug mode controlled by environment variable)
    app.run(debug=Config.DEBUG, host="0.0.0.0", port=5000)
