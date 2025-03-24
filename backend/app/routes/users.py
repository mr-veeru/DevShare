"""
Users routes module.
This module provides API endpoints for user operations including profiles, 
username lookup, and notification management.
"""
from flask import Blueprint, request, jsonify
from firebase_admin import firestore
from datetime import datetime
from ..utils.auth import verify_token
from ..services.firebase import db

users_bp = Blueprint('users', __name__)

@users_bp.route('/profile', methods=['GET', 'PUT'])
def user_profile():
    """
    Get or update the current user's profile.
    
    GET: Retrieve the profile for the authenticated user
    PUT: Update the profile for the authenticated user
    
    Returns:
        GET: JSON of user profile data
        PUT: JSON confirmation message
        JSON with error status: Error message if operation fails or unauthorized
    """
    user = verify_token(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    
    user_ref = db.collection('users').document(user['uid'])
    
    if request.method == 'GET':
        doc = user_ref.get()
        if doc.exists:
            return jsonify(doc.to_dict())
        return jsonify({"error": "Profile not found"}), 404
    
    elif request.method == 'PUT':
        try:
            profile_data = request.json
            user_ref.set(profile_data, merge=True)
            return jsonify({"message": "Profile updated successfully"})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

@users_bp.route('/<username>', methods=['GET'])
def get_user_by_username(username):
    """
    Get a user's profile by username.
    
    Args:
        username: The username to look up
        
    Returns:
        JSON: User profile data if found
        JSON with error status: Error message if not found or operation fails
    """
    user = verify_token(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    
    try:
        users_ref = db.collection('users')
        query = users_ref.where('username', '==', username).limit(1)
        docs = query.get()
        
        for doc in docs:
            return jsonify(doc.to_dict())
        
        return jsonify({"error": "User not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@users_bp.route('/notifications', methods=['GET'])
def get_notifications():
    """
    Get notifications for the authenticated user.
    
    Returns:
        JSON: List of notifications for the user
        JSON with error status: Error message if operation fails or unauthorized
    """
    user = verify_token(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    
    user_id = user['uid']
    
    try:
        # Get all notifications for the user
        notifications_ref = db.collection('notifications').where('recipientId', '==', user_id)
        notifications = notifications_ref.stream()
        
        notifications_list = []
        for notification in notifications:
            notification_data = notification.to_dict()
            notification_data['id'] = notification.id
            
            if 'createdAt' in notification_data:
                created_at = notification_data['createdAt']
                if isinstance(created_at, datetime):
                    notification_data['createdAt'] = created_at.isoformat()
            
            notifications_list.append(notification_data)
        
        return jsonify(notifications_list)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@users_bp.route('/notifications/create', methods=['POST'])
def create_notification():
    """
    Create a new notification.
    
    Returns:
        JSON: Created notification data with status 201
        JSON with error status: Error message if operation fails or unauthorized
    """
    user = verify_token(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    
    try:
        notification_data = request.json
        notification_data['createdAt'] = firestore.SERVER_TIMESTAMP
        
        doc_ref = db.collection('notifications').document()
        doc_ref.set(notification_data)
        
        # Get the created notification with its ID
        notification = doc_ref.get()
        response_data = notification.to_dict()
        response_data['id'] = notification.id
        
        return jsonify(response_data), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@users_bp.route('/notifications/<notification_id>', methods=['PUT', 'DELETE'])
def notification_operations(notification_id):
    """
    Operations on a specific notification.
    
    PUT: Update a notification (only for recipient)
    DELETE: Delete a notification (only for recipient)
    
    Args:
        notification_id: Identifier of the notification
        
    Returns:
        PUT: JSON confirmation message
        DELETE: JSON confirmation message
        JSON with error status: Error message if operation fails or unauthorized
    """
    user = verify_token(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    
    user_id = user['uid']
    
    # Get notification to verify it exists and belongs to the user
    notification_ref = db.collection('notifications').document(notification_id)
    notification = notification_ref.get()
    
    if not notification.exists:
        return jsonify({"error": "Notification not found"}), 404
    
    notification_data = notification.to_dict()
    if notification_data.get('recipientId') != user_id:
        return jsonify({"error": "Unauthorized"}), 403
    
    if request.method == 'PUT':
        try:
            update_data = request.json
            notification_ref.update(update_data)
            return jsonify({"message": "Notification updated successfully"})
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    elif request.method == 'DELETE':
        try:
            notification_ref.delete()
            return jsonify({"message": "Notification deleted successfully"})
        except Exception as e:
            return jsonify({"error": str(e)}), 500 