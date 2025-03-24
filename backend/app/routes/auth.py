"""
Authentication routes module.
This module provides API endpoints for user authentication operations.
"""
from flask import Blueprint, request, jsonify
from ..utils.auth import verify_token

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/verify', methods=['POST'])
def verify():
    """
    Verify a Firebase authentication token.
    
    This endpoint validates the Firebase ID token sent in the Authorization header
    and returns the user's ID and profile information if valid.
    
    Returns:
        JSON: User information if token is valid
        JSON with 401 status: Error message if token is invalid
    """
    # Use the verify_token utility from auth.py
    user = verify_token(request)
    if user:
        return jsonify({
            "uid": user['uid'],
            "email": user.get('email', ''),
            "name": user.get('name', '')
        })
    else:
        return jsonify({"error": "Invalid token"}), 401 