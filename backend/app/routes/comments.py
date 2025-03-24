"""
Comments routes module.
This module provides API endpoints for comment operations including creating,
reading, updating and deleting comments, as well as likes and replies functionality.
"""
from flask import Blueprint, request, jsonify
from firebase_admin import firestore
from datetime import datetime
from ..utils.auth import verify_token
from ..services.firebase import db

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
            comments_ref = db.collection('comments').where('postId', '==', post_id)
            comments = comments_ref.stream()
            
            comments_list = []
            for comment in comments:
                comment_data = comment.to_dict()
                comment_data['id'] = comment.id
                
                if 'createdAt' in comment_data:
                    created_at = comment_data['createdAt']
                    if isinstance(created_at, datetime):
                        comment_data['createdAt'] = created_at.isoformat()
                
                comments_list.append(comment_data)
            
            return jsonify(comments_list)
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    elif request.method == 'POST':
        try:
            comment_data = request.json
            comment_data['userId'] = user['uid']
            comment_data['postId'] = post_id
            comment_data['createdAt'] = firestore.SERVER_TIMESTAMP
            
            doc_ref = db.collection('comments').document()
            doc_ref.set(comment_data)
            
            # Get the created comment with its ID
            comment = doc_ref.get()
            response_data = comment.to_dict()
            response_data['id'] = comment.id
            
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

    comment_ref = db.collection('comments').document(comment_id)
    comment = comment_ref.get()

    if not comment.exists:
        return jsonify({"error": "Comment not found"}), 404

    comment_data = comment.to_dict()
    if comment_data['userId'] != user['uid']:
        return jsonify({"error": "Unauthorized"}), 403

    if request.method == 'PUT':
        try:
            update_data = request.json
            comment_ref.update(update_data)
            return jsonify({"message": "Comment updated successfully"})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    elif request.method == 'DELETE':
        try:
            comment_ref.delete()
            return jsonify({"message": "Comment deleted successfully"})
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
    comment_ref = db.collection('comments').document(comment_id)
    comment = comment_ref.get()
    if not comment.exists:
        return jsonify({"error": "Comment not found"}), 404
    
    # Reference to the user's like for this comment
    like_ref = db.collection('commentLikes').where('commentId', '==', comment_id).where('userId', '==', user_id)
    
    if request.method == 'GET':
        try:
            # Get all likes for the comment
            likes_ref = db.collection('commentLikes').where('commentId', '==', comment_id)
            likes = likes_ref.stream()
            
            likes_list = []
            user_liked = False
            like_count = 0
            
            for like in likes:
                like_data = like.to_dict()
                like_data['id'] = like.id
                
                # Check if the current user has liked this comment
                if like_data['userId'] == user_id:
                    user_liked = True
                
                likes_list.append(like_data)
                like_count += 1
            
            return jsonify({
                "count": like_count,
                "userLiked": user_liked,
                "likes": likes_list
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    elif request.method == 'POST':
        try:
            # Check if the user has already liked this comment
            existing_likes = like_ref.get()
            if len(list(existing_likes)) > 0:
                return jsonify({"message": "You already liked this comment"}), 400
            
            # Create a new like
            like_data = {
                'commentId': comment_id,
                'userId': user_id,
                'createdAt': firestore.SERVER_TIMESTAMP
            }
            
            doc_ref = db.collection('commentLikes').document()
            doc_ref.set(like_data)
            
            # Get the comment's like count and increment it
            comment_data = comment.to_dict()
            current_likes = comment_data.get('likes', 0)
            comment_ref.update({'likes': current_likes + 1})
            
            return jsonify({"message": "Comment liked successfully"}), 201
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    elif request.method == 'DELETE':
        try:
            # Check if the user has liked this comment
            existing_likes = like_ref.get()
            likes_list = list(existing_likes)
            if len(likes_list) == 0:
                return jsonify({"message": "You haven't liked this comment"}), 400
            
            # Delete the like
            for like in likes_list:
                db.collection('commentLikes').document(like.id).delete()
            
            # Get the comment's like count and decrement it
            comment_data = comment.to_dict()
            current_likes = comment_data.get('likes', 0)
            if current_likes > 0:
                comment_ref.update({'likes': current_likes - 1})
            
            return jsonify({"message": "Comment unliked successfully"})
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
            replies_ref = db.collection('replies').where('commentId', '==', comment_id)
            replies = replies_ref.stream()
            
            replies_list = []
            for reply in replies:
                reply_data = reply.to_dict()
                reply_data['id'] = reply.id
                
                if 'createdAt' in reply_data:
                    created_at = reply_data['createdAt']
                    if isinstance(created_at, datetime):
                        reply_data['createdAt'] = created_at.isoformat()
                
                replies_list.append(reply_data)
            
            return jsonify(replies_list)
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    elif request.method == 'POST':
        try:
            reply_data = request.json
            reply_data['userId'] = user_id
            reply_data['commentId'] = comment_id
            reply_data['createdAt'] = firestore.SERVER_TIMESTAMP
            
            doc_ref = db.collection('replies').document()
            doc_ref.set(reply_data)
            
            # Get the created reply with its ID
            reply = doc_ref.get()
            response_data = reply.to_dict()
            response_data['id'] = reply.id
            
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
    reply_ref = db.collection('replies').document(reply_id)
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
            reply_ref.delete()
            return jsonify({"message": "Reply deleted successfully"})
        except Exception as e:
            return jsonify({"error": str(e)}), 500 