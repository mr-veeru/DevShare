"""
Posts routes module.
This module provides API endpoints for post operations including creating,
reading, updating and deleting posts, as well as likes functionality.
"""
from flask import Blueprint, request, jsonify
from firebase_admin import firestore
from datetime import datetime
from ..utils.auth import verify_token
from ..services.firebase import db

posts_bp = Blueprint('posts', __name__)

@posts_bp.route('/', methods=['GET', 'POST'])
def posts():
    """
    Get all posts or create a new post.
    
    GET: Retrieve all posts, ordered by creation date (newest first)
    POST: Create a new post with the current user as author
    
    Returns:
        GET: JSON list of all posts
        POST: JSON of created post with status 201
        JSON with error status: Error message if operation fails
    """
    user = verify_token(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    if request.method == 'GET':
        try:
            posts_ref = db.collection('posts')
            docs = posts_ref.order_by('createdAt', direction=firestore.Query.DESCENDING).get()
            posts_list = []
            for doc in docs:
                post_data = doc.to_dict()
                post_data['id'] = doc.id
                # Convert Firestore Timestamp to ISO string
                if 'createdAt' in post_data and isinstance(post_data['createdAt'], datetime):
                    post_data['createdAt'] = post_data['createdAt'].isoformat()
                posts_list.append(post_data)
            return jsonify(posts_list)
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    elif request.method == 'POST':
        try:
            post_data = request.json
            post_data['userId'] = user['uid']
            post_data['createdAt'] = firestore.SERVER_TIMESTAMP
            doc_ref = db.collection('posts').document()
            doc_ref.set(post_data)
            
            # Get the created post with its ID
            post = doc_ref.get()
            response_data = post.to_dict()
            response_data['id'] = post.id
            
            return jsonify(response_data), 201
        except Exception as e:
            return jsonify({"error": str(e)}), 500

@posts_bp.route('/<post_id>', methods=['GET', 'PUT', 'DELETE'])
def post_operations(post_id):
    """
    Operations on a specific post.
    
    GET: Get a specific post by ID
    PUT: Update a post (only by its author)
    DELETE: Delete a post (only by its author)
    
    Args:
        post_id: Identifier of the post
        
    Returns:
        GET: JSON of the post data
        PUT: JSON confirmation message
        DELETE: JSON confirmation message
        JSON with error status: Error message if operation fails or unauthorized
    """
    user = verify_token(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    post_ref = db.collection('posts').document(post_id)
    post = post_ref.get()

    if not post.exists:
        return jsonify({"error": "Post not found"}), 404

    if request.method == 'GET':
        post_data = post.to_dict()
        post_data['id'] = post.id
        return jsonify(post_data)

    post_data = post.to_dict()
    if post_data['userId'] != user['uid']:
        return jsonify({"error": "Unauthorized"}), 403

    if request.method == 'PUT':
        try:
            update_data = request.json
            post_ref.update(update_data)
            return jsonify({"message": "Post updated successfully"})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    elif request.method == 'DELETE':
        try:
            post_ref.delete()
            return jsonify({"message": "Post deleted successfully"})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

@posts_bp.route('/<post_id>/comments', methods=['GET', 'POST'])
def post_comments(post_id):
    """
    Get comments for a post or create a new comment.
    
    This endpoint provides backward compatibility with the frontend
    by forwarding requests to the comments module.
    
    Args:
        post_id: Identifier of the post to get/add comments to
        
    Returns:
        Response from the comments endpoint
    """
    user = verify_token(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    
    from ..routes.comments import post_comments as comments_handler
    return comments_handler(post_id)

@posts_bp.route('/<post_id>/likes', methods=['GET', 'POST', 'DELETE'])
def post_likes(post_id):
    """
    Handle likes for a specific post.
    
    GET: Get all likes for a post
    POST: Add the current user's like to a post
    DELETE: Remove the current user's like from a post
    
    Args:
        post_id: Identifier of the post
        
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
    
    # Get post to verify it exists
    post_ref = db.collection('posts').document(post_id)
    post = post_ref.get()
    if not post.exists:
        return jsonify({"error": "Post not found"}), 404
    
    # Reference to the user's like for this post
    like_ref = db.collection('likes').where('postId', '==', post_id).where('userId', '==', user_id)
    
    if request.method == 'GET':
        try:
            # Get all likes for the post
            likes_ref = db.collection('likes').where('postId', '==', post_id)
            likes = likes_ref.stream()
            
            likes_list = []
            user_liked = False
            like_count = 0
            
            for like in likes:
                like_data = like.to_dict()
                like_data['id'] = like.id
                
                # Check if the current user has liked this post
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
            # Check if the user has already liked this post
            existing_likes = like_ref.get()
            if len(list(existing_likes)) > 0:
                return jsonify({"message": "You already liked this post"}), 400
            
            # Create a new like
            like_data = {
                'postId': post_id,
                'userId': user_id,
                'createdAt': firestore.SERVER_TIMESTAMP
            }
            
            doc_ref = db.collection('likes').document()
            doc_ref.set(like_data)
            
            # Get the post's like count and increment it
            post_data = post.to_dict()
            current_likes = post_data.get('likes', 0)
            post_ref.update({'likes': current_likes + 1})
            
            return jsonify({"message": "Post liked successfully"}), 201
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    elif request.method == 'DELETE':
        try:
            # Check if the user has liked this post
            existing_likes = like_ref.get()
            likes_list = list(existing_likes)
            if len(likes_list) == 0:
                return jsonify({"message": "You haven't liked this post"}), 400
            
            # Delete the like
            for like in likes_list:
                db.collection('likes').document(like.id).delete()
            
            # Get the post's like count and decrement it
            post_data = post.to_dict()
            current_likes = post_data.get('likes', 0)
            if current_likes > 0:
                post_ref.update({'likes': current_likes - 1})
            
            return jsonify({"message": "Post unliked successfully"})
        except Exception as e:
            return jsonify({"error": str(e)}), 500 