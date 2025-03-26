"""
Users routes module.
This module provides API endpoints for user operations including profiles, 
username lookup, and notification management.
"""
from flask import Blueprint, request, jsonify
from firebase_admin import firestore
from datetime import datetime
from ..utils.auth import verify_token
from ..services.firebase import db, query_documents, create_document, get_document, update_document, delete_document

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
    
    user_id = user['uid']
    
    if request.method == 'GET':
        profile_data = get_document('users', user_id)
        if profile_data:
            return jsonify(profile_data)
        return jsonify({"error": "Profile not found"}), 404
    
    elif request.method == 'PUT':
        try:
            profile_data = request.json
            
            # Use the update_document utility, but we need to check if it exists first
            existing = get_document('users', user_id)
            if existing:
                success = update_document('users', user_id, profile_data)
            else:
                # Create it if it doesn't exist
                create_document('users', profile_data, user_id)
                success = True
            
            if not success:
                return jsonify({"error": "Failed to update profile"}), 500
            
            # Get updated display name or username
            display_name = profile_data.get('displayName')
            username = profile_data.get('username')
            
            # If display name or username was updated, update all related notifications
            if display_name or username:
                # Determine the new name to use in notifications
                new_name = display_name if display_name else username
                
                if new_name:
                    # Find all notifications sent by this user using query_documents
                    notifications = query_documents(
                        collection='notifications',
                        filters=[('senderId', '==', user_id)]
                    )
                    
                    # Update each notification with the new sender name
                    for notification in notifications:
                        update_document('notifications', notification['id'], {'senderName': new_name})
            
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
        # Use query_documents to find user by username
        users = query_documents(
            collection='users',
            filters=[('username', '==', username)],
            limit_count=1
        )
        
        if users:
            return jsonify(users[0])
        
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
        # Get all notifications for the user using the improved query_documents function
        notifications_list = query_documents(
            collection='notifications',
            filters=[('recipientId', '==', user_id)],
            order_by='createdAt',
            direction='DESCENDING',
            limit_count=50
        )
        
        # Format timestamps for JSON
        for notification in notifications_list:
            if 'createdAt' in notification and isinstance(notification['createdAt'], datetime):
                notification['createdAt'] = notification['createdAt'].isoformat()
        
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
        
        # Use the create_document utility function
        doc_id = create_document('notifications', notification_data)
        
        # Get the created notification with its ID
        response_data = get_document('notifications', doc_id)
        
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
    notification_data = get_document('notifications', notification_id)
    
    if not notification_data:
        return jsonify({"error": "Notification not found"}), 404
    
    if notification_data.get('recipientId') != user_id:
        return jsonify({"error": "Unauthorized"}), 403
    
    try:
        if request.method == 'PUT':
            update_data = request.json
            success = update_document('notifications', notification_id, update_data)
            message = "Notification updated successfully"
        else:  # DELETE
            success = delete_document('notifications', notification_id)
            message = "Notification deleted successfully"
            
        if success:
            return jsonify({"message": message})
        return jsonify({"error": f"Failed to {request.method.lower()} notification"}), 500
                
    except Exception as e:
        return jsonify({"error": str(e)}), 500 