"""
Notifications Routes

Provides endpoints to fetch and manage user notifications.

Endpoints:
- GET /notifications              → list notifications (pagination)
- GET /notifications/unread_count → unread notifications count
- POST /notifications/mark_all_read → mark all as read
- POST /notifications/<id>/read   → mark single as read
"""

from flask import request
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.extensions import mongo, limiter
from src.logger import logger
from bson import ObjectId

notifications_ns = Namespace("notifications", description="User notifications management")

notification_model = notifications_ns.model("Notification", {
    "id": fields.String(description="Notification ID"),
    "type": fields.String(description="Notification type"),
    "message": fields.String(description="Human-friendly message"),
    "actor": fields.Nested(notifications_ns.model("Actor", {
        "id": fields.String(description="Actor user ID"),
        "username": fields.String(description="Actor username"),
        "email": fields.String(description="Actor email")
    })),
    "post_id": fields.String(description="Related post ID"),
    "comment_id": fields.String(description="Related comment ID"),
    "reply_id": fields.String(description="Related reply ID"),
    "read": fields.Boolean(description="Whether notification is read"),
    "created_at": fields.String(description="Creation time (ISO)")
})


def _format_notification(doc):
    """Normalize notification document for API response"""
    try:
        actor = None
        if doc.get("actor_id"):
            user = mongo.db.users.find_one({"_id": doc["actor_id"]})
            if user:
                actor = {
                    "id": str(user["_id"]),
                    "username": user.get("username"),
                    "email": user.get("email")
                }

        # Fetch post title if available
        post_title = None
        if doc.get("post_id"):
            post = mongo.db.posts.find_one({"_id": doc["post_id"]}, {"title": 1})
            if post:
                post_title = post.get("title")

        # Fetch comment/reply content if available
        comment_content = None
        if doc.get("comment_id"):
            comment = mongo.db.comments.find_one({"_id": doc["comment_id"]}, {"content": 1})
            if comment:
                comment_content = comment.get("content")
        elif doc.get("reply_id"):
            reply = mongo.db.replies.find_one({"_id": doc["reply_id"]}, {"content": 1})
            if reply:
                comment_content = reply.get("content")

        res = {
            "id": str(doc["_id"]),
            "type": doc.get("type"),
            "message": doc.get("message"),
            "actor": actor,
            "post_id": str(doc["post_id"]) if doc.get("post_id") else None,
            "post_title": post_title,
            "comment_id": str(doc["comment_id"]) if doc.get("comment_id") else None,
            "reply_id": str(doc["reply_id"]) if doc.get("reply_id") else None,
            "comment_content": comment_content,
            "read": bool(doc.get("read", False)),
            "created_at": doc.get("created_at").isoformat() if doc.get("created_at") else None
        }
        return res
    except Exception as e:
        logger.error(f"Failed to format notification: {str(e)}")
        return {"id": str(doc.get("_id", "")), "type": doc.get("type"), "read": bool(doc.get("read", False))}


@notifications_ns.route("")
class NotificationList(Resource):
    @jwt_required()
    @limiter.limit("200 per minute")
    @notifications_ns.marshal_with(notification_model, as_list=True)
    def get(self):
        """List current user's notifications with pagination (newest first)."""
        try:
            user_id = get_jwt_identity()
            page = max(int(request.args.get('page', 1)), 1)
            limit = min(max(int(request.args.get('limit', 20)), 1), 100)
            skip = (page - 1) * limit

            query = {"recipient_id": ObjectId(user_id)}
            total = mongo.db.notifications.count_documents(query)
            items = []
            for doc in mongo.db.notifications.find(query).sort([("created_at", -1)]).skip(skip).limit(limit):
                items.append(_format_notification(doc))

            return items, 200, {
                "X-Total-Count": str(total),
                "X-Page": str(page),
                "X-Limit": str(limit)
            }
        except Exception as e:
            logger.error(f"Error listing notifications: {str(e)}")
            return {"message": "Internal server error"}, 500


@notifications_ns.route("/unread_count")
class UnreadCount(Resource):
    @jwt_required()
    @limiter.limit("300 per minute")
    def get(self):
        """Get unread notifications count for current user."""
        try:
            user_id = get_jwt_identity()
            count = mongo.db.notifications.count_documents({
                "recipient_id": ObjectId(user_id),
                "read": False
            })
            return {"unread": count}, 200
        except Exception as e:
            logger.error(f"Error counting unread notifications: {str(e)}")
            return {"message": "Internal server error"}, 500


@notifications_ns.route("/mark_all_read")
class MarkAllRead(Resource):
    @jwt_required()
    @limiter.limit("60 per minute")
    def post(self):
        """Mark all notifications as read for current user."""
        try:
            user_id = get_jwt_identity()
            result = mongo.db.notifications.update_many(
                {"recipient_id": ObjectId(user_id), "read": False},
                {"$set": {"read": True}}
            )
            return {"updated": result.modified_count}, 200
        except Exception as e:
            logger.error(f"Error marking all as read: {str(e)}")
            return {"message": "Internal server error"}, 500


@notifications_ns.route("/<string:notif_id>/read")
class MarkRead(Resource):
    @jwt_required()
    @limiter.limit("300 per minute")
    def post(self, notif_id):
        """Mark a single notification as read."""
        try:
            if not ObjectId.is_valid(notif_id):
                return {"message": "Invalid notification ID"}, 400

            user_id = get_jwt_identity()
            result = mongo.db.notifications.update_one(
                {"_id": ObjectId(notif_id), "recipient_id": ObjectId(user_id)},
                {"$set": {"read": True}}
            )
            if result.matched_count == 0:
                return {"message": "Notification not found"}, 404
            return {"message": "Marked as read"}, 200
        except Exception as e:
            logger.error(f"Error marking notification as read: {str(e)}")
            return {"message": "Internal server error"}, 500


@notifications_ns.route("/<string:notif_id>")
class DeleteNotification(Resource):
    @jwt_required()
    @limiter.limit("120 per minute")
    def delete(self, notif_id):
        """Delete a single notification owned by current user."""
        try:
            if not ObjectId.is_valid(notif_id):
                return {"message": "Invalid notification ID"}, 400
            user_id = get_jwt_identity()
            result = mongo.db.notifications.delete_one({
                "_id": ObjectId(notif_id),
                "recipient_id": ObjectId(user_id)
            })
            if result.deleted_count == 0:
                return {"message": "Notification not found"}, 404
            return {"message": "Notification deleted"}, 200
        except Exception as e:
            logger.error(f"Error deleting notification: {str(e)}")
            return {"message": "Internal server error"}, 500


@notifications_ns.route("/clear_all")
class ClearAll(Resource):
    @jwt_required()
    @limiter.limit("30 per minute")
    def post(self):
        """Delete all notifications for current user."""
        try:
            user_id = get_jwt_identity()
            result = mongo.db.notifications.delete_many({"recipient_id": ObjectId(user_id)})
            return {"deleted": result.deleted_count}, 200
        except Exception as e:
            logger.error(f"Error clearing notifications: {str(e)}")
            return {"message": "Internal server error"}, 500
