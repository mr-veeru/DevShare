"""
Social Utilities

Common helper functions for social interactions including likes, comments, and replies.
This module provides shared utilities across social modules.
"""

from src.extensions import mongo
from src.logger import logger
from bson import ObjectId
import datetime


def to_object_id(val):
    """
    Normalize a value to ObjectId.
    
    Args:
        val: Value to convert (can be None, ObjectId, or string)
        
    Returns:
        ObjectId or None
    """
    if val is None:
        return None
    if isinstance(val, ObjectId):
        return val
    return ObjectId(str(val)) if ObjectId.is_valid(str(val)) else None


def get_user_info(user_id):
    """Get user information by user ID"""
    user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
    if user:
        return {
            "id": str(user["_id"]),
            "username": user["username"],
            "email": user["email"]
        }
    return None


def check_post_exists(post_id):
    """Check if post exists and return error message with status code"""
    if not ObjectId.is_valid(post_id):
        return "Invalid post ID format", 400
    
    # Use count_documents for better performance - only checks existence
    count = mongo.db.posts.count_documents({"_id": ObjectId(post_id)})
    if count == 0:
        return "Post not found", 404
    
    return None, None  # No error means post exists


def check_comment_exists(comment_id):
    """Check if comment exists and return it with status code"""
    if not ObjectId.is_valid(comment_id):
        return None, "Invalid comment ID format", 400
    
    comment = mongo.db.comments.find_one({"_id": ObjectId(comment_id)})
    if not comment:
        return None, "Comment not found", 404
    
    return comment, None, None


def check_reply_exists(reply_id):
    """Check if reply exists and return it with status code"""
    if not ObjectId.is_valid(reply_id):
        return None, "Invalid reply ID format", 400
    
    reply = mongo.db.replies.find_one({"_id": ObjectId(reply_id)})
    if not reply:
        return None, "Reply not found", 404
    
    return reply, None, None


def format_reply(reply):
    """Format a reply document for API response"""
    # Store original IDs before conversion
    original_id = reply["_id"]
    original_user_id = reply["user_id"]
    
    # Convert fields for API response
    reply["id"] = str(original_id)
    reply["user"] = get_user_info(original_user_id)
    reply["comment_id"] = str(reply["comment_id"])
    reply["post_id"] = str(reply["post_id"])
    reply["created_at"] = reply["created_at"].isoformat()
    reply["updated_at"] = reply["updated_at"].isoformat()
    reply["likes_count"] = reply.get("likes_count", 0)
    
    # Remove MongoDB internal fields
    del reply["_id"]
    del reply["user_id"]
    return reply


def format_comment(comment, include_replies=True):
    """Format a comment document for API response"""
    # Store original IDs before conversion
    original_id = comment["_id"]
    original_user_id = comment["user_id"]
    
    # Convert fields for API response
    comment["id"] = str(original_id)
    comment["user"] = get_user_info(original_user_id)
    comment["post_id"] = str(comment["post_id"])
    comment["created_at"] = comment["created_at"].isoformat()
    comment["updated_at"] = comment["updated_at"].isoformat()
    comment["likes_count"] = comment.get("likes_count", 0)
    
    # Remove MongoDB internal fields
    del comment["_id"]
    del comment["user_id"]
    
    if include_replies:
        # Get replies for this comment using original ObjectId
        replies = []
        for reply in mongo.db.replies.find({"comment_id": original_id}).sort("created_at", -1):
            replies.append(format_reply(reply))
        
        comment["replies"] = replies
        comment["replies_count"] = len(replies)
    else:
        # New comment has no replies yet
        comment["replies"] = []
        comment["replies_count"] = 0
    
    return comment


# Notifications

# Supported notification types:
# - post_liked: someone liked your post
# - comment_added: someone commented on your post
# - reply_added: someone replied to your comment
# - comment_liked: someone liked your comment
# - reply_liked: someone liked your reply
def create_notification(recipient_id, actor_id, notif_type, *, post_id=None, comment_id=None, reply_id=None, message=None):
    """Create a notification document for a recipient.

    Args:
        recipient_id (str|ObjectId): User who receives the notification
        actor_id (str|ObjectId): User who performed the action
        notif_type (str): One of supported types
        post_id/comment_id/reply_id: Optional context ids
        message (str|None): Optional custom message

    Returns:
        None (errors are logged but do not raise)
    """
    try:
        # Normalize ids to ObjectId
        recipient_oid = to_object_id(recipient_id)
        actor_oid = to_object_id(actor_id)
        post_oid = to_object_id(post_id)
        comment_oid = to_object_id(comment_id)
        reply_oid = to_object_id(reply_id)

        if not recipient_oid or not actor_oid:
            return

        # Do not notify for self-actions
        if recipient_oid == actor_oid:
            return

        notification = {
            "recipient_id": recipient_oid,
            "actor_id": actor_oid,
            "type": notif_type,
            "post_id": post_oid,
            "comment_id": comment_oid,
            "reply_id": reply_oid,
            "message": message,
            "read": False,
            "created_at": datetime.datetime.utcnow()
        }

        mongo.db.notifications.insert_one(notification)
    except Exception as e:
        # Never crash the main flow due to notification failures
        logger.error(f"Failed to create notification: {str(e)}")


def delete_notification(recipient_id, actor_id, notif_type, *, post_id=None, comment_id=None, reply_id=None):
    """Delete a notification matching the given criteria.
    
    Used when unliking to remove the notification that was created when liking.

    Args:
        recipient_id (str|ObjectId): User who received the notification
        actor_id (str|ObjectId): User who performed the action (and is now unliking)
        notif_type (str): Notification type to match (e.g., "post_liked")
        post_id/comment_id/reply_id: Optional context ids to match
    """
    try:
        # Normalize ids to ObjectId
        recipient_oid = to_object_id(recipient_id)
        actor_oid = to_object_id(actor_id)
        post_oid = to_object_id(post_id)
        comment_oid = to_object_id(comment_id)
        reply_oid = to_object_id(reply_id)

        if not recipient_oid or not actor_oid:
            return

        # Build query to find matching notification
        query = {
            "recipient_id": recipient_oid,
            "actor_id": actor_oid,
            "type": notif_type
        }
        
        # Add optional context IDs
        if post_oid:
            query["post_id"] = post_oid
        if comment_oid:
            query["comment_id"] = comment_oid
        if reply_oid:
            query["reply_id"] = reply_oid

        # Delete matching notification
        result = mongo.db.notifications.delete_one(query)
        if result.deleted_count > 0:
            logger.debug(f"Deleted notification: {notif_type} for recipient {recipient_oid} from actor {actor_oid}")
    except Exception as e:
        # Never crash the main flow due to notification failures
        logger.error(f"Failed to delete notification: {str(e)}")
