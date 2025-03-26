"""
Posts routes module.
This module provides API endpoints for post operations including creating,
reading, updating and deleting posts, as well as likes functionality.
"""
from flask import Blueprint, request, jsonify
from firebase_admin import firestore
from ..utils.auth import verify_token
from ..services.firebase import db, query_documents, create_document, get_document, update_document, delete_document
from ..utils.user import delete_notifications

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
            # Get all posts ordered by creation date
            posts_list = query_documents(
                collection='posts',
                order_by='createdAt',
                direction='DESCENDING'
            )
            return jsonify(posts_list)
        except Exception as e:
            print(f"Error fetching posts: {e}")  # Add logging for debugging
            return jsonify({"error": str(e)}), 500

    elif request.method == 'POST':
        try:
            post_data = request.json
            post_data['userId'] = user['uid']
            post_data['createdAt'] = firestore.SERVER_TIMESTAMP
            
            # Create the post
            doc_id = create_document('posts', post_data)
            if not doc_id:
                return jsonify({"error": "Failed to create post"}), 500
            
            # Get the created post
            response_data = get_document('posts', doc_id)
            return jsonify(response_data), 201
        except Exception as e:
            print(f"Error creating post: {e}")  # Add logging for debugging
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

    post_data = get_document('posts', post_id)
    if not post_data:
        return jsonify({"error": "Post not found"}), 404

    if request.method == 'GET':
        return jsonify(post_data)

    if post_data['userId'] != user['uid']:
        return jsonify({"error": "Unauthorized"}), 403

    if request.method == 'PUT':
        try:
            update_data = request.json
            success = update_document('posts', post_id, update_data)
            if success:
                return jsonify({"message": "Post updated successfully"})
            return jsonify({"error": "Failed to update post"}), 500
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    elif request.method == 'DELETE':
        try:
            # Delete the post
            success = delete_document('posts', post_id)
            if not success:
                return jsonify({"error": "Failed to delete post"}), 500
            
            # Delete all notifications related to this post
            delete_notifications(post_id=post_id)
            
            # Delete all comments, replies and likes associated with this post
            batch = db.batch()
            
            # Delete comments and their related content
            comments = query_documents('comments', [('postId', '==', post_id)])
            for comment in comments:
                comment_id = comment['id']
                # Delete replies
                replies = query_documents('replies', [('commentId', '==', comment_id)])
                for reply in replies:
                    batch.delete(db.collection('replies').document(reply['id']))
                
                # Delete comment likes
                comment_likes = query_documents('commentLikes', [('commentId', '==', comment_id)])
                for like in comment_likes:
                    batch.delete(db.collection('commentLikes').document(like['id']))
                
                # Delete the comment
                batch.delete(db.collection('comments').document(comment_id))
            
            # Delete post likes
            likes = query_documents('likes', [('postId', '==', post_id)])
            for like in likes:
                batch.delete(db.collection('likes').document(like['id']))
            
            # Commit all deletions
            batch.commit()
            
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
    post_data = get_document('posts', post_id)
    if not post_data:
        return jsonify({"error": "Post not found"}), 404
    
    if request.method == 'GET':
        try:
            # Get all likes for the post
            likes = query_documents('likes', [('postId', '==', post_id)])
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
            # Check if the user has already liked this post
            existing_likes = query_documents('likes', [
                ('postId', '==', post_id),
                ('userId', '==', user_id)
            ])
            
            if existing_likes:
                return jsonify({"error": "Post already liked"}), 400
            
            # Create new like
            like_data = {
                'postId': post_id,
                'userId': user_id,
                'createdAt': firestore.SERVER_TIMESTAMP
            }
            
            doc_id = create_document('likes', like_data)
            if doc_id:
                return jsonify({"message": "Post liked successfully"}), 201
            return jsonify({"error": "Failed to like post"}), 500
            
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    elif request.method == 'DELETE':
        try:
            # Find and delete the user's like
            likes = query_documents('likes', [
                ('postId', '==', post_id),
                ('userId', '==', user_id)
            ])
            
            if not likes:
                return jsonify({"error": "Like not found"}), 404
            
            success = delete_document('likes', likes[0]['id'])
            if success:
                return jsonify({"message": "Post unliked successfully"})
            return jsonify({"error": "Failed to unlike post"}), 500
            
        except Exception as e:
            return jsonify({"error": str(e)}), 500 