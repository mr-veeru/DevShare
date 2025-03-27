"""
Comments routes module.
This module provides API endpoints for comment operations including creating,
reading, updating and deleting comments, as well as likes and replies functionality.
"""
from flask import Blueprint, request, jsonify
from firebase_admin import firestore, auth
from ..utils.auth import verify_token
from ..utils.user import create_notification, delete_notifications
from ..services.firebase import db, query_documents, create_document, get_document, update_document, delete_document

comments_bp = Blueprint('comments', __name__)

# Helper functions
def handle_error(error, action_name="perform operation", status_code=500):
    """Standardizes error handling for the comments routes"""
    print(f"Error in {action_name}: {str(error)}")
    return jsonify({"error": f"Failed to {action_name}: {str(error)}"}), status_code

def validate_owner(user_id, resource_id, collection_name):
    """Validates that the current user owns the specified resource"""
    resource = get_document(collection_name, resource_id)
    if not resource:
        return None, (jsonify({"error": f"{collection_name.capitalize()} not found"}), 404)
    
    if resource['userId'] != user_id:
        return None, (jsonify({"error": "Unauthorized"}), 403)
    
    return resource, None

def get_username_from_auth(user_id, default='Anonymous'):
    """Get username from Firebase Auth or use default"""
    try:
        auth_user = auth.get_user(user_id)
        return auth_user.display_name or default
    except:
        return default

@comments_bp.route('/<post_id>', methods=['GET', 'POST'])
def post_comments(post_id):
    """
    Get comments for a post or create a new comment.
    
    GET: Retrieve all comments for a specific post
    POST: Create a new comment on a specific post
    """
    user = verify_token(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    if request.method == 'GET':
        try:
            comments = query_documents('comments', [('postId', '==', post_id)])
            return jsonify(comments)
        except Exception as e:
            return handle_error(e, "fetch comments")

    elif request.method == 'POST':
        try:
            comment_data = request.json
            user_id = user['uid']
            comment_data['userId'] = user_id
            comment_data['username'] = user.get('name') or get_username_from_auth(user_id)
            comment_data['postId'] = post_id
            comment_data['createdAt'] = firestore.SERVER_TIMESTAMP
            
            # Create the comment
            doc_id = create_document('comments', comment_data)
            if not doc_id:
                return jsonify({"error": "Failed to create comment"}), 500
            
            # Get the created comment
            response_data = get_document('comments', doc_id)
            
            # Create a notification for the post owner (if not self-comment)
            post_data = get_document('posts', post_id)
            
            if post_data and post_data.get('userId') != user_id:
                create_notification(
                    recipient_id=post_data.get('userId'),
                    sender_id=user_id,
                    post_id=post_id,
                    post_title=post_data.get('title'),
                    comment_id=doc_id,
                    notification_type='comment',
                    content=comment_data.get('text')
                )
            
            return jsonify(response_data), 201
        except Exception as e:
            return handle_error(e, "create comment")

@comments_bp.route('/<comment_id>', methods=['PUT', 'DELETE'])
def comment_operations(comment_id):
    """
    Operations on a specific comment.
    
    PUT: Update a comment (only by its author)
    DELETE: Delete a comment (only by its author)
    """
    user = verify_token(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    
    user_id = user['uid']
    
    # Get comment to verify it exists and belongs to the user
    comment, error = validate_owner(user_id, comment_id, 'comments')
    if error:
        return error
    
    if request.method == 'PUT':
        try:
            update_data = request.json
            success = update_document('comments', comment_id, update_data)
            if success:
                return jsonify({"message": "Comment updated successfully"})
            return jsonify({"error": "Failed to update comment"}), 500
        except Exception as e:
            return handle_error(e, "update comment")

    elif request.method == 'DELETE':
        try:
            # Start a batch operation
            batch = db.batch()
            comment_ref = db.collection('comments').document(comment_id)
            
            # Delete the comment completely (not just mark as deleted)
            batch.delete(comment_ref)
            
            # Delete all notifications related to this comment
            delete_notifications(comment_id=comment_id)
            
            # Get all replies for this comment
            replies = query_documents('comments', [('parentId', '==', comment_id)])
            
            # Delete all replies completely (not just mark as deleted)
            for reply in replies:
                reply_ref = db.collection('comments').document(reply['id'])
                batch.delete(reply_ref)
                
                # Delete notifications for each reply
                delete_notifications(comment_id=reply['id'])
                
                # Delete likes for each reply
                likes = query_documents('commentLikes', [('commentId', '==', reply['id'])])
                for like in likes:
                    batch.delete(db.collection('commentLikes').document(like['id']))
                    delete_notifications(comment_id=reply['id'], notification_type='comment_like')
            
            # Delete likes for the main comment
            comment_likes = query_documents('commentLikes', [('commentId', '==', comment_id)])
            for like in comment_likes:
                batch.delete(db.collection('commentLikes').document(like['id']))
                delete_notifications(comment_id=comment_id, notification_type='comment_like')
            
            # Commit all updates
            batch.commit()
            
            return jsonify({"message": "Comment and all replies deleted successfully"})
        except Exception as e:
            return handle_error(e, "delete comment")

@comments_bp.route('/<comment_id>/likes', methods=['GET', 'POST', 'DELETE'])
def comment_likes(comment_id):
    """
    Handle likes for a specific comment.
    
    GET: Get all likes for a comment
    POST: Add the current user's like to a comment
    DELETE: Remove the current user's like from a comment
    """
    user = verify_token(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    
    user_id = user['uid']
    
    # Check if the comment exists
    comment = get_document('comments', comment_id)
    if not comment:
        return jsonify({"error": "Comment not found"}), 404
    
    if request.method == 'GET':
        try:
            # Get likes for this comment
            likes = query_documents('commentLikes', [('commentId', '==', comment_id)])
            
            # Check if the current user has liked this comment
            user_liked = any(like['userId'] == user_id for like in likes)
            
            return jsonify({
                "count": len(likes),
                "likes": likes,
                "userLiked": user_liked
            })
        except Exception as e:
            return handle_error(e, "fetch comment likes")

    elif request.method == 'POST':
        try:
            # Check if user already liked this comment
            existing_likes = query_documents('commentLikes', [
                ('commentId', '==', comment_id),
                ('userId', '==', user_id)
            ])
            
            if existing_likes:
                return jsonify({"error": "You already liked this comment"}), 400
            
            # Create a new like
            like_data = {
                'commentId': comment_id,
                'userId': user_id,
                'createdAt': firestore.SERVER_TIMESTAMP
            }
            
            like_id = create_document('commentLikes', like_data)
            
            # Create notification for the comment owner (if not self-like)
            comment_owner_id = comment.get('userId')
            if comment_owner_id and comment_owner_id != user_id:
                # Get post title for the notification
                post_id = comment.get('postId')
                post_data = get_document('posts', post_id)
                post_title = post_data.get('title') if post_data else "a post"
                
                create_notification(
                    recipient_id=comment_owner_id,
                    sender_id=user_id,
                    post_id=comment.get('postId'),
                    post_title=post_title,  # Include post title in notification
                    comment_id=comment_id,
                    notification_type='comment_like',
                    content=comment.get('text', '')[:100]  # Truncate content for notification
                )
            
            return jsonify({"message": "Comment liked successfully", "likeId": like_id}), 201
        except Exception as e:
            return handle_error(e, "like comment")

    elif request.method == 'DELETE':
        try:
            # Find the user's like
            likes = query_documents('commentLikes', [
                ('commentId', '==', comment_id),
                ('userId', '==', user_id)
            ])
            
            if not likes:
                return jsonify({"error": "You haven't liked this comment"}), 400
            
            # Delete the like
            like_id = likes[0]['id']
            success = delete_document('commentLikes', like_id)
            
            if not success:
                return jsonify({"error": "Failed to unlike comment"}), 500
            
            # Delete like notification
            delete_notifications(
                comment_id=comment_id,
                notification_type='comment_like',
                sender_id=user_id
            )
            
            return jsonify({"message": "Comment unliked successfully"})
        except Exception as e:
            return handle_error(e, "unlike comment")

@comments_bp.route('/<comment_id>/replies', methods=['GET', 'POST'])
def comment_replies(comment_id):
    """
    Get replies for a comment or create a new reply.
    
    GET: Retrieve all replies for a specific comment
    POST: Create a new reply to a specific comment
    """
    user = verify_token(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    
    user_id = user['uid']
    
    # Check if the comment exists
    comment = get_document('comments', comment_id)
    if not comment:
        return jsonify({"error": "Comment not found"}), 404
    
    if request.method == 'GET':
        try:
            # Get replies for this comment
            replies = query_documents('comments', [('parentId', '==', comment_id)])
            return jsonify(replies)
        except Exception as e:
            return handle_error(e, "fetch replies")

    elif request.method == 'POST':
        try:
            # Create a new reply
            reply_data = request.json
            reply_data['userId'] = user_id
            
            # Try to get username from auth or use from request data
            username = reply_data.get('username')
            if not username:
                username = user.get('name') or get_username_from_auth(user_id)
            
            reply_data['username'] = username
            reply_data['parentId'] = comment_id
            reply_data['postId'] = comment.get('postId')
            reply_data['createdAt'] = firestore.SERVER_TIMESTAMP
            
            # Create the reply
            reply_id = create_document('comments', reply_data)
            
            # Get the created reply
            response_data = get_document('comments', reply_id)
            
            # Create notification for the comment owner (if not self-reply)
            if comment and comment.get('userId') != user_id:
                # Get post title for the notification
                post_id = comment.get('postId')
                post_data = get_document('posts', post_id)
                post_title = post_data.get('title') if post_data else "a post"
                
                create_notification(
                    recipient_id=comment.get('userId'),
                    sender_id=user_id,
                    post_id=post_id,
                    post_title=post_title,  # Include post title in notification
                    comment_id=comment_id,
                    notification_type='reply',
                    content=reply_data.get('text', '')[:100]  # Truncate content for notification
                )

            # Also notify the post owner (if different from comment owner and not self)
            if post_data and post_data.get('userId') != user_id and post_data.get('userId') != comment.get('userId'):
                create_notification(
                    recipient_id=post_data.get('userId'),
                    sender_id=user_id,
                    post_id=post_id,
                    post_title=post_title,  # Include post title in notification
                    comment_id=comment_id,
                    notification_type='reply',
                    content=reply_data.get('text', '')[:100]  # Truncate content for notification
                )
            
            return jsonify(response_data), 201
        except Exception as e:
            return handle_error(e, "create reply")

@comments_bp.route('/replies/<reply_id>', methods=['PUT', 'DELETE'])
def reply_operations(reply_id):
    """
    Operations on a specific reply.
    
    PUT: Update a reply (only by its author)
    DELETE: Delete a reply (only by its author)
    """
    user = verify_token(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    
    user_id = user['uid']
    
    reply, error = validate_owner(user_id, reply_id, 'comments')
    if error:
        return error
    
    # Verify this is actually a reply (has a parentId)
    if not reply.get('parentId'):
        return jsonify({"error": "This is not a reply"}), 400
    
    if request.method == 'PUT':
        try:
            update_data = request.json
            success = update_document('comments', reply_id, update_data)
            if success:
                return jsonify({"message": "Reply updated successfully"})
            return jsonify({"error": "Failed to update reply"}), 500
        except Exception as e:
            return handle_error(e, "update reply")

    elif request.method == 'DELETE':
        try:
            # Completely delete the reply instead of just marking it
            success = delete_document('comments', reply_id)
            
            if not success:
                return jsonify({"error": "Failed to delete reply"}), 500
            
            # Delete all notifications related to this reply
            delete_notifications(comment_id=reply_id)
            
            # Delete likes for the reply
            likes = query_documents('commentLikes', [('commentId', '==', reply_id)])
            for like in likes:
                delete_document('commentLikes', like['id'])
                # Delete like notifications
                delete_notifications(
                    comment_id=reply_id,
                    notification_type='comment_like'
                )
            
            return jsonify({"message": "Reply deleted successfully"})
        except Exception as e:
            return handle_error(e, "delete reply") 