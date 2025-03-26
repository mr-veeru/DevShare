"""
Comments routes module.
This module provides API endpoints for comment operations including creating,
reading, updating and deleting comments, as well as likes and replies functionality.
"""
from flask import Blueprint, request, jsonify
from firebase_admin import firestore
from ..utils.auth import verify_token
from ..services.firebase import db, query_documents, create_document, get_document, update_document, delete_document
from ..utils.user import create_notification, delete_notifications
from firebase_admin import auth

comments_bp = Blueprint('comments', __name__)

@comments_bp.route('/<post_id>', methods=['GET', 'POST'])
def post_comments(post_id):
    """
    Get comments for a post or create a new comment.
    
    GET: Retrieve all comments for a specific post
    POST: Create a new comment on a specific post
    
    Args:
        post_id: Identifier of the post to get/add comments to
        
    Returns:
        GET: JSON list of comments for the post
        POST: JSON of created comment with status 201
        JSON with error status: Error message if operation fails
    """
    user = verify_token(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    if request.method == 'GET':
        try:
            comments = query_documents('comments', [('postId', '==', post_id)])
            return jsonify(comments)
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    elif request.method == 'POST':
        try:
            comment_data = request.json
            comment_data['userId'] = user['uid']
            comment_data['username'] = user.get('name', 'Anonymous')  # Use authenticated user's name
            comment_data['postId'] = post_id
            comment_data['createdAt'] = firestore.SERVER_TIMESTAMP
            
            # Create the comment
            doc_id = create_document('comments', comment_data)
            if not doc_id:
                return jsonify({"error": "Failed to create comment"}), 500
            
            # Get the created comment
            response_data = get_document('comments', doc_id)
            
            # Create a notification for the post owner (if not self-comment)
            user_id = user['uid']
            post_data = get_document('posts', post_id)
            
            if post_data:
                post_owner_id = post_data.get('userId')
                
                # Only create notification if commenter is not post owner
                if post_owner_id and post_owner_id != user_id:
                    create_notification(
                        recipient_id=post_owner_id,
                        sender_id=user_id,
                        post_id=post_id,
                        post_title=post_data.get('title'),
                        comment_id=doc_id,
                        notification_type='comment',
                        content=comment_data.get('text')
                    )
            
            return jsonify(response_data), 201
        except Exception as e:
            return jsonify({"error": str(e)}), 500

@comments_bp.route('/<comment_id>', methods=['PUT', 'DELETE'])
def comment_operations(comment_id):
    """
    Operations on a specific comment.
    
    PUT: Update a comment (only by its author)
    DELETE: Delete a comment (only by its author)
    
    Args:
        comment_id: Identifier of the comment
        
    Returns:
        PUT: JSON confirmation message
        DELETE: JSON confirmation message
        JSON with error status: Error message if operation fails or unauthorized
    """
    user = verify_token(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    
    user_id = user['uid']
    
    # Get comment to verify it exists and belongs to the user
    comment_ref = db.collection('comments').document(comment_id)
    comment = comment_ref.get()
    
    if not comment.exists:
        return jsonify({"error": "Comment not found"}), 404
    
    comment_data = comment.to_dict()
    if comment_data['userId'] != user_id:
        return jsonify({"error": "Unauthorized"}), 403
    
    if request.method == 'PUT':
        try:
            update_data = request.json
            success = update_document('comments', comment_id, update_data)
            if success:
                return jsonify({"message": "Comment updated successfully"})
            return jsonify({"error": "Failed to update comment"}), 500
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    elif request.method == 'DELETE':
        try:
            # Start a batch operation
            batch = db.batch()
            
            # Mark the comment as deleted
            batch.update(comment_ref, {
                'deleted': True,
                'deletedAt': firestore.SERVER_TIMESTAMP
            })
            
            # Delete all notifications related to this comment
            delete_notifications(comment_id=comment_id)
            
            # Get all replies for this comment
            replies = query_documents('comments', [('parentId', '==', comment_id)])
            
            # Mark all replies as deleted and delete their notifications
            for reply in replies:
                reply_ref = db.collection('comments').document(reply['id'])
                batch.update(reply_ref, {
                    'deleted': True,
                    'deletedAt': firestore.SERVER_TIMESTAMP
                })
                
                # Delete notifications for each reply
                delete_notifications(comment_id=reply['id'])
                
                # Delete likes for each reply
                likes = query_documents('commentLikes', [('commentId', '==', reply['id'])])
                for like in likes:
                    batch.delete(db.collection('commentLikes').document(like['id']))
                    # Delete like notifications
                    delete_notifications(
                        comment_id=reply['id'],
                        notification_type='comment_like'
                    )
            
            # Delete likes for the main comment
            comment_likes = query_documents('commentLikes', [('commentId', '==', comment_id)])
            for like in comment_likes:
                batch.delete(db.collection('commentLikes').document(like['id']))
                # Delete like notifications
                delete_notifications(
                    comment_id=comment_id,
                    notification_type='comment_like'
                )
            
            # Commit all updates
            batch.commit()
            
            return jsonify({"message": "Comment and all replies deleted successfully"})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

@comments_bp.route('/<comment_id>/likes', methods=['GET', 'POST', 'DELETE'])
def comment_likes(comment_id):
    """
    Handle likes for a specific comment.
    
    GET: Get all likes for a comment
    POST: Add the current user's like to a comment
    DELETE: Remove the current user's like from a comment
    
    Args:
        comment_id: Identifier of the comment
        
    Returns:
        GET: JSON with like count, user's like status, and like details
        POST: JSON confirmation message with status 201
        DELETE: JSON confirmation message
        JSON with error status: Error message if operation fails
    """
    user = verify_token(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    
    user_id = user['uid']
    
    # Get comment to verify it exists
    comment_data = get_document('comments', comment_id)
    if not comment_data:
        return jsonify({"error": "Comment not found"}), 404
    
    if request.method == 'GET':
        try:
            # Get all likes for the comment
            likes = query_documents('commentLikes', [('commentId', '==', comment_id)])
            user_liked = any(like['userId'] == user_id for like in likes)
            
            return jsonify({
                "count": len(likes),
                "userLiked": user_liked,
                "likes": likes
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    elif request.method == 'POST':
        try:
            # Check if the user has already liked this comment
            existing_likes = query_documents('commentLikes', [
                ('commentId', '==', comment_id),
                ('userId', '==', user_id)
            ])
            
            if existing_likes:
                return jsonify({"error": "Comment already liked"}), 400
            
            # Create new like
            like_data = {
                'commentId': comment_id,
                'userId': user_id,
                'createdAt': firestore.SERVER_TIMESTAMP
            }
            
            doc_id = create_document('commentLikes', like_data)
            if doc_id:
                # Create notification for comment owner (if not self-like)
                comment_owner_id = comment_data.get('userId')
                if comment_owner_id and comment_owner_id != user_id:
                    # Get post data for title
                    post_data = get_document('posts', comment_data.get('postId'))
                    post_title = post_data.get('title') if post_data else None
                    
                    create_notification(
                        recipient_id=comment_owner_id,
                        sender_id=user_id,
                        post_id=comment_data.get('postId'),
                        post_title=post_title,
                        comment_id=comment_id,
                        notification_type='comment_like',
                        content=comment_data.get('text')
                    )
                return jsonify({"message": "Comment liked successfully"}), 201
            return jsonify({"error": "Failed to like comment"}), 500
            
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    elif request.method == 'DELETE':
        try:
            # Find and delete the user's like
            likes = query_documents('commentLikes', [
                ('commentId', '==', comment_id),
                ('userId', '==', user_id)
            ])
            
            if not likes:
                return jsonify({"error": "Like not found"}), 404
            
            success = delete_document('commentLikes', likes[0]['id'])
            if success:
                # Delete associated notification
                delete_notifications(
                    sender_id=user_id,
                    comment_id=comment_id,
                    notification_type='comment_like'
                )
                return jsonify({"message": "Comment unliked successfully"})
            return jsonify({"error": "Failed to unlike comment"}), 500
            
        except Exception as e:
            return jsonify({"error": str(e)}), 500

@comments_bp.route('/<comment_id>/replies', methods=['GET', 'POST'])
def comment_replies(comment_id):
    """
    Get replies for a comment or create a new reply.
    
    GET: Retrieve all replies for a specific comment
    POST: Create a new reply to a specific comment
    
    Args:
        comment_id: Identifier of the comment to get/add replies to
        
    Returns:
        GET: JSON list of replies for the comment
        POST: JSON of created reply with status 201
        JSON with error status: Error message if operation fails
    """
    user = verify_token(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    
    user_id = user['uid']
    
    # Get comment to verify it exists
    comment_ref = db.collection('comments').document(comment_id)
    comment = comment_ref.get()
    if not comment.exists:
        return jsonify({"error": "Comment not found"}), 404
    
    if request.method == 'GET':
        try:
            # Get all replies for the comment
            replies = query_documents('comments', [('parentId', '==', comment_id)])
            return jsonify(replies)
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    elif request.method == 'POST':
        try:
            reply_data = request.json
            
            # Force set the correct user information
            reply_data['userId'] = user_id
            
            # Try to get username from the request data first (client-side)
            # If not available, try to get from Firebase Auth
            if 'username' not in reply_data or not reply_data['username']:
                try:
                    auth_user = auth.get_user(user_id)
                    reply_data['username'] = auth_user.display_name or 'Anonymous'
                except Exception as e:
                    print(f"Error getting auth user: {e}")
                    reply_data['username'] = 'Anonymous'
            
            reply_data['parentId'] = comment_id
            reply_data['postId'] = comment.to_dict().get('postId')
            reply_data['createdAt'] = firestore.SERVER_TIMESTAMP
            
            # Create the reply
            doc_id = create_document('comments', reply_data)
            if not doc_id:
                return jsonify({"error": "Failed to create reply"}), 500
            
            # Get the created reply
            response_data = get_document('comments', doc_id)
            
            # Create notification for comment owner (if not self-reply)
            comment_data = comment.to_dict()
            comment_owner_id = comment_data.get('userId')
            
            if comment_owner_id and comment_owner_id != user_id:
                # Get post data for title
                post_data = get_document('posts', comment_data.get('postId'))
                post_title = post_data.get('title') if post_data else None
                
                # Create notification for comment owner
                create_notification(
                    recipient_id=comment_owner_id,
                    sender_id=user_id,
                    post_id=comment_data.get('postId'),
                    post_title=post_title,
                    comment_id=comment_id,
                    notification_type='reply',
                    content=reply_data.get('text')
                )
            
            return jsonify(response_data), 201
        except Exception as e:
            return jsonify({"error": str(e)}), 500

@comments_bp.route('/replies/<reply_id>', methods=['PUT', 'DELETE'])
def reply_operations(reply_id):
    """
    Operations on a specific reply.
    
    PUT: Update a reply (only by its author)
    DELETE: Delete a reply (only by its author)
    
    Args:
        reply_id: Identifier of the reply
        
    Returns:
        PUT: JSON confirmation message
        DELETE: JSON confirmation message
        JSON with error status: Error message if operation fails or unauthorized
    """
    user = verify_token(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    
    user_id = user['uid']
    
    # Get reply to verify it exists and belongs to the user
    reply_ref = db.collection('comments').document(reply_id)
    reply = reply_ref.get()
    
    if not reply.exists:
        return jsonify({"error": "Reply not found"}), 404
    
    reply_data = reply.to_dict()
    if reply_data['userId'] != user_id:
        return jsonify({"error": "Unauthorized"}), 403
    
    if request.method == 'PUT':
        try:
            update_data = request.json
            reply_ref.update(update_data)
            return jsonify({"message": "Reply updated successfully"})
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    elif request.method == 'DELETE':
        try:
            # Start a batch operation
            batch = db.batch()
            
            # Mark the reply as deleted
            batch.update(reply_ref, {
                'deleted': True,
                'deletedAt': firestore.SERVER_TIMESTAMP
            })
            
            # Delete notifications for this reply
            delete_notifications(comment_id=reply_id)
            
            # Delete likes for this reply
            likes = query_documents('commentLikes', [('commentId', '==', reply_id)])
            for like in likes:
                batch.delete(db.collection('commentLikes').document(like['id']))
                # Delete like notifications
                delete_notifications(
                    comment_id=reply_id,
                    notification_type='comment_like'
                )
            
            # Commit all updates
            batch.commit()
            
            return jsonify({"message": "Reply deleted successfully"})
        except Exception as e:
            return jsonify({"error": str(e)}), 500 