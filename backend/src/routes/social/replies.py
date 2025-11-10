"""
Comment Replies Management Module

This module provides comprehensive reply management functionality for comments.
It handles the nested social interaction of users replying to comments.

Features:
- Create, read, update, delete replies
- User information display for each reply
- Comment reply count tracking and management
- Authorization controls (users can edit/delete their own replies)
"""

from flask import request
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.extensions import mongo, limiter
from src.logger import logger
from src.utils import check_comment_exists, check_reply_exists, format_reply, get_user_info
from src.utils.social_utils import create_notification, delete_notification
from bson import ObjectId
import datetime

# Namespace
replies_ns = Namespace("replies", description="Comment replies management")

# Swagger Models
reply_model = replies_ns.model("Reply", {
    "content": fields.String(required=True, description="Reply content", min_length=1, max_length=1000)
})

reply_response_model = replies_ns.model("ReplyResponse", {
    "id": fields.String(description="Reply ID"),
    "content": fields.String(description="Reply content"),
    "user": fields.Nested(replies_ns.model("UserInfo", {
        "id": fields.String(description="User ID"),
        "username": fields.String(description="Username"),
        "email": fields.String(description="Email")
    })),
    "comment_id": fields.String(description="Comment ID"),
    "post_id": fields.String(description="Post ID"),
    "created_at": fields.String(description="Reply creation time"),
    "updated_at": fields.String(description="Reply update time"),
    "likes_count": fields.Integer(description="Number of likes for reply"),
    "liked": fields.Boolean(description="Whether current user liked this reply")
})

# Like response model for replies
reply_like_response_model = replies_ns.model("ReplyLikeResponse", {
    "id": fields.String(description="Like ID"),
    "user": fields.Nested(replies_ns.model("UserInfoLike", {
        "id": fields.String(description="User ID"),
        "username": fields.String(description="Username"),
        "email": fields.String(description="Email")
    })),
    "reply_id": fields.String(description="Reply ID"),
    "created_at": fields.String(description="Like creation time")
})


# Routes
@replies_ns.route("/comments/<string:comment_id>/replies")
class CommentReplies(Resource):
    @jwt_required()
    @limiter.limit("30 per minute")  # Allow rapid replies
    @replies_ns.expect(reply_model)
    @replies_ns.marshal_with(reply_response_model, code=201)
    @replies_ns.doc(description="Add a new reply to a comment")
    @replies_ns.response(400, "Bad Request")
    @replies_ns.response(404, "Comment Not Found")
    def post(self, comment_id):
        """Add a reply to a comment"""
        try:
            user_id = get_jwt_identity()
            data = request.get_json()
            content = data.get("content", "").strip()
            
            if not content:
                return {"message": "Reply content cannot be empty"}, 400
            
            # Check if comment exists
            comment, error, status_code = check_comment_exists(comment_id)
            if error:
                return {"message": error}, status_code
            
            # Create reply
            reply_data = {
                "user_id": ObjectId(user_id),
                "comment_id": ObjectId(comment_id),
                "post_id": comment["post_id"],
                "content": content,
                "created_at": datetime.datetime.utcnow(),
                "updated_at": datetime.datetime.utcnow()
            }
            
            mongo.db.replies.insert_one(reply_data)
            
            # Update comment replies count for individual comment tracking
            mongo.db.comments.update_one(
                {"_id": ObjectId(comment_id)},
                {"$inc": {"replies_count": 1}}
            )
            
            # Update post comments count (includes replies in total count like social media)
            mongo.db.posts.update_one(
                {"_id": ObjectId(comment["post_id"])},
                {"$inc": {"comments_count": 1}}
            )
            
            # Format reply for response
            reply_data = format_reply(reply_data)
            
            logger.info(f"User {user_id} replied to comment {comment_id}")
            # Notify comment owner and post owner
            try:
                # Get post owner
                post = mongo.db.posts.find_one({"_id": comment["post_id"]}, {"user_id": 1})
                post_owner_id = post.get("user_id") if post else None
                comment_owner_id = comment["user_id"]
                
                # Notify comment owner
                create_notification(
                    recipient_id=comment_owner_id,
                    actor_id=user_id,
                    notif_type="reply_added",
                    post_id=comment["post_id"],
                    comment_id=comment["_id"],
                    reply_id=reply_data.get("id")
                )
                
                # Notify post owner if different from comment owner and different from replier
                if post_owner_id and str(post_owner_id) != str(comment_owner_id) and str(post_owner_id) != user_id:
                    create_notification(
                        recipient_id=post_owner_id,
                        actor_id=user_id,
                        notif_type="reply_added",
                        post_id=comment["post_id"],
                        comment_id=comment["_id"],
                        reply_id=reply_data.get("id")
                    )
            except Exception as e:
                logger.error(f"Notification error on reply add: {str(e)}")
            return reply_data, 201
            
        except Exception as e:
            logger.error(f"Error adding reply to comment {comment_id}: {str(e)}")
            return {"message": "Internal server error"}, 500

    @jwt_required()
    @replies_ns.doc(description="Get all replies for a specific comment")
    @replies_ns.marshal_with(reply_response_model, as_list=True)
    @replies_ns.response(400, "Bad Request")
    @replies_ns.response(404, "Comment Not Found")
    def get(self, comment_id):
        """Get all replies for a comment"""
        try:
            # Check if comment exists
            comment, error, status_code = check_comment_exists(comment_id)
            if error:
                return {"message": error}, status_code
            
            # Get replies for the comment (returns empty list if no replies)
            replies = []
            for reply in mongo.db.replies.find({"comment_id": ObjectId(comment_id)}).sort("created_at", -1):
                # Format reply for complete social data
                formatted_reply = format_reply(reply)
                replies.append(formatted_reply)
            
            return replies, 200
            
        except Exception as e:
            logger.error(f"Error fetching replies for comment {comment_id}: {str(e)}")
            return {"message": "Internal server error"}, 500

@replies_ns.route("/<string:reply_id>")
class ReplyModify(Resource):
    @jwt_required()
    @replies_ns.expect(reply_model)
    @replies_ns.marshal_with(reply_response_model)
    @replies_ns.doc(description="Edit an existing reply. Only the reply owner can edit.")
    @replies_ns.response(200, "Success")
    @replies_ns.response(400, "Bad Request")
    @replies_ns.response(403, "Forbidden")
    @replies_ns.response(404, "Reply Not Found")
    def put(self, reply_id):
        """Edit a reply. Only the reply owner can edit."""
        try:
            user_id = get_jwt_identity()
            data = request.get_json()
            content = data.get("content", "").strip()
            
            if not content:
                return {"message": "Reply content cannot be empty"}, 400
            
            # Check if reply exists
            reply, error, status_code = check_reply_exists(reply_id)
            if error:
                return {"message": error}, status_code
            
            # Check if user owns the reply
            if str(reply["user_id"]) != user_id:
                return {"message": "You can only edit your own replies"}, 403
            
            # Update the reply
            mongo.db.replies.update_one(
                {"_id": ObjectId(reply_id)},
                {"$set": {
                    "content": content,
                    "updated_at": datetime.datetime.utcnow()
                }}
            )
            
            # Get updated reply and format for complete social data
            updated_reply = mongo.db.replies.find_one({"_id": ObjectId(reply_id)})
            formatted_reply = format_reply(updated_reply)
            
            logger.info(f"User {user_id} edited reply {reply_id}")
            return formatted_reply, 200
            
        except Exception as e:
            logger.error(f"Error editing reply {reply_id}: {str(e)}")
            return {"message": "Internal server error"}, 500

    @jwt_required()
    @replies_ns.doc(description="Delete an existing reply. Only the reply owner or post owner can delete.")
    @replies_ns.response(200, "Success")
    @replies_ns.response(400, "Bad Request")
    @replies_ns.response(403, "Forbidden")
    @replies_ns.response(404, "Reply Not Found")
    def delete(self, reply_id):
        """Delete a reply. Only the reply owner or post owner can delete."""
        try:
            user_id = get_jwt_identity()
            
            # Check if reply exists
            reply, error, status_code = check_reply_exists(reply_id)
            if error:
                return {"message": error}, status_code
            
            # Check if user owns the reply or the post
            post = mongo.db.posts.find_one({"_id": reply["post_id"]})
            if str(reply["user_id"]) != user_id and str(post["user_id"]) != user_id:
                return {"message": "You can only delete your own replies or replies on your posts"}, 403
            
            # Cascade delete all related data
            # 1. Delete all likes on this reply
            mongo.db.reply_likes.delete_many({"reply_id": ObjectId(reply_id)})
            
            # 2. Delete the reply itself
            mongo.db.replies.delete_one({"_id": ObjectId(reply_id)})
            
            # Update comment replies count for proper tracking
            mongo.db.comments.update_one(
                {"_id": reply["comment_id"]},
                {"$inc": {"replies_count": -1}}
            )
            
            # Update post comments count for proper tracking
            mongo.db.posts.update_one(
                {"_id": reply["post_id"]},
                {"$inc": {"comments_count": -1}}
            )
            
            logger.info(f"User {user_id} deleted reply {reply_id}")
            return {"message": "Reply deleted successfully"}, 200
            
        except Exception as e:
            logger.error(f"Error deleting reply {reply_id}: {str(e)}")
            return {"message": "Internal server error"}, 500


@replies_ns.route("/<string:reply_id>/likes")
class ReplyLikes(Resource):
    @jwt_required()
    @limiter.limit("200 per minute")
    @replies_ns.marshal_with(reply_like_response_model, as_list=True)
    def get(self, reply_id):
        try:
            reply, error, status = check_reply_exists(reply_id)
            if error:
                return {"message": error}, status

            likes = []
            for like in mongo.db.reply_likes.find({"reply_id": ObjectId(reply_id)}).sort("created_at", -1):
                original_id = like["_id"]
                original_user_id = like["user_id"]
                like["id"] = str(original_id)
                like["user"] = get_user_info(original_user_id)
                like["reply_id"] = str(like["reply_id"])
                like["created_at"] = like["created_at"].isoformat()
                del like["_id"]
                del like["user_id"]
                likes.append(like)
            return likes, 200
        except Exception as e:
            logger.error(f"Error fetching likes for reply {reply_id}: {str(e)}")
            return {"message": "Internal server error"}, 500

    @jwt_required()
    @limiter.limit("100 per minute")
    @replies_ns.doc(description="Toggle like/unlike for a reply")
    def post(self, reply_id):
        try:
            user_id = get_jwt_identity()
            reply, error, status = check_reply_exists(reply_id)
            if error:
                return {"message": error}, status

            existing = mongo.db.reply_likes.find_one({
                "user_id": ObjectId(user_id),
                "reply_id": ObjectId(reply_id)
            })

            if existing:
                mongo.db.reply_likes.delete_one({
                    "user_id": ObjectId(user_id),
                    "reply_id": ObjectId(reply_id)
                })
                mongo.db.replies.update_one({"_id": ObjectId(reply_id)}, {"$inc": {"likes_count": -1}})
                updated = mongo.db.replies.find_one({"_id": ObjectId(reply_id)})
                
                # Delete the notification that was created when liking
                try:
                    delete_notification(
                        recipient_id=reply["user_id"],
                        actor_id=user_id,
                        notif_type="reply_liked",
                        post_id=reply["post_id"],
                        comment_id=reply["comment_id"],
                        reply_id=reply_id
                    )
                except Exception as e:
                    logger.error(f"Notification deletion error on reply unlike: {str(e)}")
                
                return {"liked": False, "likes_count": updated.get("likes_count", 0)}, 200
            else:
                mongo.db.reply_likes.insert_one({
                    "user_id": ObjectId(user_id),
                    "reply_id": ObjectId(reply_id),
                    "comment_id": reply["comment_id"],
                    "post_id": reply["post_id"],
                    "created_at": datetime.datetime.utcnow()
                })
                mongo.db.replies.update_one({"_id": ObjectId(reply_id)}, {"$inc": {"likes_count": 1}})
                updated = mongo.db.replies.find_one({"_id": ObjectId(reply_id)})
                # Notify reply owner
                try:
                    create_notification(
                        recipient_id=reply["user_id"],
                        actor_id=user_id,
                        notif_type="reply_liked",
                        post_id=reply["post_id"],
                        comment_id=reply["comment_id"],
                        reply_id=reply["_id"]
                    )
                except Exception as e:
                    logger.error(f"Notification error on reply like: {str(e)}")
                return {"liked": True, "likes_count": updated.get("likes_count", 0)}, 200
        except Exception as e:
            logger.error(f"Error toggling like on reply {reply_id}: {str(e)}")
            return {"message": "Internal server error"}, 500
