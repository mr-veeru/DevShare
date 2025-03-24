"""
Flask application factory module.
This module contains the application factory function that creates and configures the Flask app.
"""
from flask import Flask, jsonify
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def create_app():
    """
    Flask application factory function.
    
    Creates and configures a Flask application instance with all necessary
    middleware, database connections, and registered routes.
    
    Returns:
        Flask: A configured Flask application instance
    """
    app = Flask(__name__)
    
    # Configure CORS - more permissive for development
    # In production, these settings should be more restrictive
    CORS(app, 
        origins=["http://localhost:3000"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"],
        supports_credentials=True,
        expose_headers=["Content-Type", "Authorization"],
        max_age=3600
    )

    # Force trailing slashes to prevent redirect issues with CORS
    app.url_map.strict_slashes = False

    # Initialize Firebase Admin with credentials from environment variables
    cred = credentials.Certificate({
        "type": "service_account",
        "project_id": os.getenv("FIREBASE_PROJECT_ID"),
        "private_key_id": os.getenv("FIREBASE_PRIVATE_KEY_ID"),
        "private_key": os.getenv("FIREBASE_PRIVATE_KEY").replace('\\n', '\n'),
        "client_email": os.getenv("FIREBASE_CLIENT_EMAIL"),
        "client_id": os.getenv("FIREBASE_CLIENT_ID"),
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_x509_cert_url": os.getenv("FIREBASE_CLIENT_CERT_URL")
    })

    firebase_admin.initialize_app(cred)

    # Register blueprints for API route modules
    from .routes.auth import auth_bp
    from .routes.users import users_bp
    from .routes.posts import posts_bp
    from .routes.comments import comments_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(posts_bp, url_prefix='/api/posts')
    app.register_blueprint(comments_bp, url_prefix='/api/comments')
    
    # Add test endpoints for health checking and testing authentication
    @app.route('/api/test', methods=['GET'])
    def test():
        """Simple health check endpoint to verify the API is running."""
        return jsonify({"message": "Backend is working correctly"}), 200
    
    return app 