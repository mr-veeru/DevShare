"""
Authentication utility module.
This module provides utility functions for Firebase authentication
including token verification and user ID extraction.
"""
from firebase_admin import auth
from typing import Dict, Optional, Any

def verify_token(request) -> Optional[Dict[str, Any]]:
    """
    Verify Firebase ID token from request header.
    
    Extracts the Bearer token from the Authorization header and
    verifies it with Firebase Authentication.
    
    Args:
        request: Flask request object containing headers
        
    Returns:
        Dict containing user data if token is valid, None otherwise
    """
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None
        
    token = auth_header.split('Bearer ')[1]
    try:
        return auth.verify_id_token(token)
    except Exception:
        return None

def get_user_id(request) -> Optional[str]:
    """
    Get user ID from verified token.
    
    A convenience function that verifies the token and extracts
    just the user ID.
    
    Args:
        request: Flask request object containing headers
        
    Returns:
        String containing user ID if token is valid, None otherwise
    """
    try:
        user = verify_token(request)
        return user['uid'] if user else None
    except Exception as e:
        print(f"Error extracting user ID from token: {e}")
        return None 