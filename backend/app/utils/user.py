"""
User utility module.
This module provides utility functions for user-related operations.
"""
from firebase_admin import auth, firestore
from typing import Dict, Any, Optional
from ..services.firebase import db, query_documents, create_document, delete_document, get_document

def get_user_display_name(user_id: str) -> str:
    """
    Get a user's display name from Firestore or Firebase Auth.
    
    This function tries multiple sources to get the user's name:
    1. Firestore user document's displayName field
    2. Firestore user document's username field
    3. Firebase Auth user's display_name
    4. Firebase Auth user's email (with domain removed)
    5. Fallback to "A user" if all else fails
    
    Args:
        user_id: User ID to get the display name for
        
    Returns:
        String containing the user's display name
    """
    # Default fallback name
    sender_name = "A user"
    
    # Try to get from Firestore first
    user_data = get_document('users', user_id)
    if user_data:
        if 'displayName' in user_data and user_data['displayName']:
            return user_data['displayName']
        elif 'username' in user_data and user_data['username']:
            return user_data['username']
    
    # If not found in Firestore, try to get from Firebase Auth
    try:
        auth_user = auth.get_user(user_id)
        if auth_user.display_name:
            return auth_user.display_name
        elif auth_user.email:
            # Use email as fallback but remove domain part
            return auth_user.email.split('@')[0]
    except Exception as e:
        # Log the error but continue with default name
        print(f"Error getting auth user: {e}")
    
    # Return default name if everything else fails
    return sender_name

def create_notification(recipient_id: str, sender_id: str, post_id: str = None, 
                       post_title: str = None, comment_id: str = None, 
                       notification_type: str = 'like', read: bool = False,
                       content: str = None) -> str:
    """
    Create a notification with standardized format.
    
    Args:
        recipient_id: User ID of the recipient
        sender_id: User ID of the sender
        post_id: Optional ID of the related post
        post_title: Optional title of the related post
        comment_id: Optional ID of the related comment
        notification_type: Type of notification ('like', 'comment', 'comment_like', 'reply', etc.)
        read: Whether the notification has been read
        content: Optional content of the comment/reply
        
    Returns:
        String ID of the created notification
    """
    try:
        # Validate required parameters
        if not recipient_id or not sender_id:
            print("Warning: Missing required parameters for notification creation")
            return None
            
        # Don't create notifications if sender is recipient
        if recipient_id == sender_id:
            print("Info: Skipping notification where sender is recipient")
            return None
        
        # Get sender's display name
        sender_name = get_user_display_name(sender_id)
        
        # Create notification data
        notification_data = {
            'recipientId': recipient_id,
            'senderId': sender_id,
            'senderName': sender_name,
            'type': notification_type,
            'read': read,
            'createdAt': firestore.SERVER_TIMESTAMP,
            'message': ''  # Will be set below
        }
        
        # Add optional fields if provided
        if post_id:
            notification_data['postId'] = post_id
        if post_title:
            notification_data['postTitle'] = post_title
        if comment_id:
            notification_data['commentId'] = comment_id
        if content:
            notification_data['content'] = content
            
        # Set notification message based on type
        project_title = f'"{post_title}"' if post_title else "your project"
        content_preview = f': "{content[:100]}..."' if content else ""
        
        if notification_type == 'like':
            notification_data['message'] = f"{sender_name} liked {project_title}"
        elif notification_type == 'comment':
            notification_data['message'] = f"{sender_name} commented on {project_title}{content_preview}"
        elif notification_type == 'comment_like':
            notification_data['message'] = f"{sender_name} liked your comment{content_preview}"
        elif notification_type == 'reply':
            notification_data['message'] = f"{sender_name} replied to your comment{content_preview}"
        elif notification_type == 'reply_like':
            notification_data['message'] = f"{sender_name} liked your reply{content_preview}"
        
        # Create the notification
        doc_id = create_document('notifications', notification_data)
        if not doc_id:
            print("Error: Failed to create notification document")
            return None
            
        return doc_id
    except Exception as e:
        print(f"Error creating notification: {e}")
        return None

def delete_notifications(
    recipient_id: str = None, 
    sender_id: str = None, 
    post_id: str = None, 
    comment_id: str = None,
    notification_type: str = None
) -> int:
    """
    Delete notifications based on specified criteria.
    
    Args:
        recipient_id: Optional recipient user ID filter
        sender_id: Optional sender user ID filter
        post_id: Optional post ID filter
        comment_id: Optional comment ID filter
        notification_type: Optional notification type filter
        
    Returns:
        Number of notifications deleted
    """
    try:
        # Require at least one filter parameter
        if not any([recipient_id, sender_id, post_id, comment_id, notification_type]):
            print("Warning: Attempted to delete notifications without any filter")
            return 0
            
        # Build filters list
        filters = []
        if recipient_id:
            filters.append(('recipientId', '==', recipient_id))
        if sender_id:
            filters.append(('senderId', '==', sender_id))
        if post_id:
            filters.append(('postId', '==', post_id))
        if comment_id:
            filters.append(('commentId', '==', comment_id))
        if notification_type:
            filters.append(('type', '==', notification_type))
            
        # Get matching notifications
        notifications = query_documents('notifications', filters)
        
        # Delete them and count
        deleted_count = 0
        for notification in notifications:
            if delete_document('notifications', notification['id']):
                deleted_count += 1
            
        return deleted_count
    except Exception as e:
        print(f"Error deleting notifications: {e}")
        return 0 