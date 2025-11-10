"""
Profile Management Routes

Handles user profile management operations including viewing, updating, password changes, and account deletion.

Endpoints:
- GET /profile - Get user profile information
- PUT /profile - Update user profile (fullname, username, email, bio)
- PUT /profile/change-password - Change user password
- DELETE /profile/delete-account - Delete user account with cascade cleanup
"""

from flask import request
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.extensions import mongo
from src.logger import logger
import datetime
from bson import ObjectId
from werkzeug.security import generate_password_hash, check_password_hash
import re
from gridfs import GridFS
from src.routes.auth import USERNAME_REGEX, EMAIL_REGEX, PASSWORD_REGEX

# Namespace
profile_ns = Namespace("profile", description="User profile and post management operations")

# Swagger models
profile_model = profile_ns.model("Profile", {
    "id": fields.String(description="User ID"),
    "username": fields.String(description="Username"),
    "fullname": fields.String(description="Full name"),
    "bio": fields.String(description="User bio"),
    "email": fields.String(description="Email address"),
    "posts_count": fields.Integer(description="Number of posts created"),
    "likes_received": fields.Integer(description="Total likes received across all posts"),
    "created_at": fields.String(description="Account creation time")
})

post_edit_model = profile_ns.model("PostEdit", {
    "title": fields.String(required=False, description="Project title", min_length=1, max_length=200),
    "description": fields.String(required=False, description="Project description", min_length=1, max_length=2000),
    "tech_stack": fields.List(fields.String, required=False, description="Technologies used (array of strings)", min_items=1, max_items=20),
    "github_link": fields.String(required=False, description="Optional GitHub link", pattern="^https://github\\.com/.*"),
    "files": fields.List(fields.Raw, required=False, description="New files to add (max 10 files, 16MB each)")
})

post_response_model = profile_ns.model("PostResponse", {
    "id": fields.String(description="Post ID"),
    "title": fields.String(description="Project title"),
    "description": fields.String(description="Project description"),
    "tech_stack": fields.List(fields.String),
    "github_link": fields.String,
    "files": fields.List(fields.Nested(profile_ns.model("FileInfo", {
        "file_id": fields.String(description="File ID in GridFS"),
        "filename": fields.String(description="Original filename"),
        "content_type": fields.String(description="File MIME type"),
        "size": fields.Integer(description="File size in bytes")
    }))),
    "user_id": fields.String(description="User who created the post"),
    "likes_count": fields.Integer(description="Number of likes"),
    "comments_count": fields.Integer(description="Number of comments"),
    "created_at": fields.String(description="Post creation time"),
    "updated_at": fields.String(description="Post last update time")
})

# ---------- Routes ----------
@profile_ns.route("")
class UserProfile(Resource):
    @jwt_required()
    def get(self):
        """
        Get current user's profile information including post count.
        """
        try:
            user_id = get_jwt_identity()
            
            # Get user information
            user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
            if not user:
                return {"message": "User not found"}, 404
            
            # Count user's posts
            posts_count = mongo.db.posts.count_documents({"user_id": ObjectId(user_id)})
            
            # Calculate total likes received across all user posts
            user_posts = mongo.db.posts.find({"user_id": ObjectId(user_id)}, {"_id": 1})
            post_ids = [post["_id"] for post in user_posts]
            likes_received = mongo.db.likes.count_documents({"post_id": {"$in": post_ids}})
            
            # Prepare response
            profile = {
                "id": str(user["_id"]),
                "username": user["username"],
                "fullname": user.get("fullname", ""),
                "email": user["email"],
                "bio": user.get("bio", ""),
                "posts_count": posts_count,
                "likes_received": likes_received,
                "created_at": user["created_at"].isoformat() + "Z"
            }
            
            return profile, 200
            
        except Exception as e:
            logger.error(f"Error fetching user profile: {str(e)}")
            return {"message": "Internal server error"}, 500

    @jwt_required()
    def put(self):
        """
        Update current user's profile information.
        
        Allows updating fullname, username, and email.
        Validates username uniqueness and email format.
        """
        try:
            user_id = get_jwt_identity()
            data = request.get_json() or {}
            
            # Check for unexpected fields
            allowed_fields = {"fullname", "username", "email", "bio"}
            unexpected_fields = set(data.keys()) - allowed_fields
            if unexpected_fields:
                return {
                    "message": f"Unexpected fields: {', '.join(unexpected_fields)}",
                    "unexpected_fields": list(unexpected_fields),
                    "expected_fields": list(allowed_fields)
                }, 400
            
            # Get user information
            user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
            if not user:
                return {"message": "User not found"}, 404
            
            # Prepare update data
            update_data = {}
            
            # Update fullname if provided
            if "fullname" in data:
                fullname = data.get("fullname", "").strip()
                if not fullname:
                    return {"message": "Full name cannot be empty"}, 400
                if len(fullname) > 100:
                    return {"message": "Full name must be 100 characters or less"}, 400
                update_data["fullname"] = fullname
            
            # Update username if provided
            if "username" in data:
                username = data.get("username", "").lower().strip()
                if not username:
                    return {"message": "Username cannot be empty"}, 400
                if not re.match(USERNAME_REGEX, username):
                    return {"message": "Username must be at least 3 characters and alphanumeric only"}, 400
                # Check if username is taken by another user
                existing_user = mongo.db.users.find_one({"username": username, "_id": {"$ne": ObjectId(user_id)}})
                if existing_user:
                    return {"message": "Username already taken"}, 400
                update_data["username"] = username
            
            # Update email if provided
            if "email" in data:
                email = data.get("email", "").lower().strip()
                if not email:
                    return {"message": "Email cannot be empty"}, 400
                if not re.match(EMAIL_REGEX, email):
                    return {"message": "Invalid email format"}, 400
                # Check if email is taken by another user
                existing_user = mongo.db.users.find_one({"email": email, "_id": {"$ne": ObjectId(user_id)}})
                if existing_user:
                    return {"message": "Email already in use"}, 400
                update_data["email"] = email
            
            # Update bio if provided
            if "bio" in data:
                bio = data.get("bio", "").strip()
                if len(bio) > 500:
                    return {"message": "Bio must be 500 characters or less"}, 400
                update_data["bio"] = bio
            
            # Update the user document
            if update_data:
                mongo.db.users.update_one(
                    {"_id": ObjectId(user_id)},
                    {"$set": update_data}
                )
                logger.info(f"Profile updated for user {user_id}")
                
                # Return updated profile
                updated_user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
                posts_count = mongo.db.posts.count_documents({"user_id": ObjectId(user_id)})
                user_posts = mongo.db.posts.find({"user_id": ObjectId(user_id)}, {"_id": 1})
                post_ids = [post["_id"] for post in user_posts]
                likes_received = mongo.db.likes.count_documents({"post_id": {"$in": post_ids}})
                
                profile = {
                    "id": str(updated_user["_id"]),
                    "username": updated_user["username"],
                    "fullname": updated_user.get("fullname", ""),
                    "email": updated_user["email"],
                    "bio": updated_user.get("bio", ""),
                    "posts_count": posts_count,
                    "likes_received": likes_received,
                    "created_at": updated_user["created_at"].isoformat() + "Z"
                }
                
                return profile, 200
            else:
                return {"message": "No valid fields provided for update"}, 400
            
        except Exception as e:
            logger.error(f"Error updating user profile: {str(e)}")
            return {"message": "Internal server error"}, 500


@profile_ns.route("/change-password")
class ChangePassword(Resource):
    @jwt_required()
    def put(self):
        """
        Change user password.
        
        Requires current password, new password, and confirmation.
        Validates password strength and matches.
        """
        try:
            user_id = get_jwt_identity()
            data = request.get_json() or {}
            
            # Check for required fields
            allowed_fields = {"current_password", "new_password", "confirm_password"}
            unexpected_fields = set(data.keys()) - allowed_fields
            if unexpected_fields:
                return {
                    "message": f"Unexpected fields: {', '.join(unexpected_fields)}",
                    "unexpected_fields": list(unexpected_fields),
                    "expected_fields": list(allowed_fields)
                }, 400
            
            current_password = data.get("current_password")
            new_password = data.get("new_password")
            confirm_password = data.get("confirm_password")
            
            if not current_password or not new_password or not confirm_password:
                return {"message": "All password fields are required"}, 400
            
            # Get user
            user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
            if not user:
                return {"message": "User not found"}, 404
            
            # Verify current password
            if not check_password_hash(user["password"], current_password):
                return {"message": "Current password is incorrect"}, 400
            
            # Validate password match
            if new_password != confirm_password:
                return {"message": "New password and confirm password do not match"}, 400
            
            # Validate password strength
            if not re.match(PASSWORD_REGEX, new_password):
                return {"message": "Password must be at least 8 characters with uppercase, digit, and special character (@#$%&*!?)"}, 400
            
            # Check if new password is same as current
            if check_password_hash(user["password"], new_password):
                return {"message": "New password must be different from current password"}, 400
            
            # Update password
            mongo.db.users.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {"password": generate_password_hash(new_password)}}
            )
            
            # Log password change event without sensitive data
            logger.info(f"Password changed successfully for user {user_id}")
            return {"message": "Password changed successfully"}, 200
            
        except Exception as e:
            # Log error without exposing sensitive password information
            logger.error(f"Error changing password for user {user_id}: {type(e).__name__}")
            return {"message": "Internal server error"}, 500


@profile_ns.route("/delete-account")
class DeleteAccount(Resource):
    @jwt_required()
    def delete(self):
        """
        Delete user account permanently.
        
        Requires password confirmation for security.
        This will permanently delete:
        - User account
        - All user posts and associated data (likes, comments, replies)
        - All notifications related to the user
        """
        try:
            user_id = get_jwt_identity()
            data = request.get_json() or {}
            
            password = data.get("password")
            if not password:
                return {"message": "Password is required to delete account"}, 400
            
            # Get user and verify password
            user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
            if not user:
                return {"message": "User not found"}, 404
            
            # Verify password
            if not check_password_hash(user["password"], password):
                return {"message": "Incorrect password"}, 400
            
            user_oid = ObjectId(user_id)
            
            # Get all user's posts for cascade deletion
            user_posts = list(mongo.db.posts.find({"user_id": user_oid}))
            post_ids = [post["_id"] for post in user_posts]
            
            # Collect all file IDs from user's posts for GridFS deletion
            fs = GridFS(mongo.db)
            file_ids_to_delete = []
            for post in user_posts:
                for file_info in post.get("files", []):
                    file_id = file_info.get("file_id")
                    if file_id and ObjectId.is_valid(file_id):
                        file_ids_to_delete.append(ObjectId(file_id))
            
            # ===== CASCADE DELETE ALL RELATED DATA =====
            
            # 0. Delete all files from GridFS
            for file_id in file_ids_to_delete:
                try:
                    fs.delete(file_id)
                except Exception as e:
                    logger.warning(f"Failed to delete GridFS file {file_id}: {str(e)}")
            
            # 1. Delete all likes on user's posts (and update counts)
            if post_ids:
                mongo.db.likes.delete_many({"post_id": {"$in": post_ids}})
                # Update likes_count on user's posts (set to 0 since all likes are deleted)
                mongo.db.posts.update_many(
                    {"_id": {"$in": post_ids}},
                    {"$set": {"likes_count": 0}}
                )
            
            # 2. Get all comments on user's posts
            comments_on_user_posts = list(mongo.db.comments.find({"post_id": {"$in": post_ids}})) if post_ids else []
            comment_ids_on_user_posts = [comment["_id"] for comment in comments_on_user_posts]
            
            # 3. Get all comments made by user (on others' posts)
            user_comments = list(mongo.db.comments.find({"user_id": user_oid}))
            user_comment_ids = [comment["_id"] for comment in user_comments]
            
            # Track posts that need comments_count updates (from user's comments)
            posts_needing_comment_update = {}
            for comment in user_comments:
                post_id = comment["post_id"]
                if post_id not in posts_needing_comment_update:
                    posts_needing_comment_update[post_id] = 0
                posts_needing_comment_update[post_id] += 1
            
            # Combine all comment IDs (comments on user's posts + user's comments)
            all_comment_ids = list(set(comment_ids_on_user_posts + user_comment_ids))
            
            # 4. Delete all comment likes (on user's comments and comments on user's posts)
            # First, get comment likes made by user to update counts
            user_comment_likes = list(mongo.db.comment_likes.find({"user_id": user_oid}))
            comments_needing_like_update = {}
            for like in user_comment_likes:
                comment_id = like["comment_id"]
                if comment_id not in comments_needing_like_update:
                    comments_needing_like_update[comment_id] = 0
                comments_needing_like_update[comment_id] += 1
            
            # Delete all comment likes (both on user's comments and comments on user's posts)
            if all_comment_ids:
                mongo.db.comment_likes.delete_many({"comment_id": {"$in": all_comment_ids}})
            
            # Update likes_count on comments that user liked
            for comment_id, count in comments_needing_like_update.items():
                mongo.db.comments.update_one(
                    {"_id": comment_id},
                    {"$inc": {"likes_count": -count}}
                )
            
            # 5. Get all replies to comments (both on user's posts and user's comments)
            replies_to_comments = list(mongo.db.replies.find({"comment_id": {"$in": all_comment_ids}})) if all_comment_ids else []
            reply_ids_to_comments = [reply["_id"] for reply in replies_to_comments]
            
            # 6. Get all replies made by user
            user_replies = list(mongo.db.replies.find({"user_id": user_oid}))
            user_reply_ids = [reply["_id"] for reply in user_replies]
            
            # Track comments and posts that need replies_count/comments_count updates
            comments_needing_reply_update = {}
            posts_needing_reply_update = {}
            for reply in user_replies:
                comment_id = reply["comment_id"]
                post_id = reply["post_id"]
                if comment_id not in comments_needing_reply_update:
                    comments_needing_reply_update[comment_id] = 0
                comments_needing_reply_update[comment_id] += 1
                if post_id not in posts_needing_reply_update:
                    posts_needing_reply_update[post_id] = 0
                posts_needing_reply_update[post_id] += 1
            
            # Combine all reply IDs
            all_reply_ids = list(set(reply_ids_to_comments + user_reply_ids))
            
            # 7. Delete all reply likes
            # First, get reply likes made by user to update counts
            user_reply_likes = list(mongo.db.reply_likes.find({"user_id": user_oid}))
            replies_needing_like_update = {}
            for like in user_reply_likes:
                reply_id = like["reply_id"]
                if reply_id not in replies_needing_like_update:
                    replies_needing_like_update[reply_id] = 0
                replies_needing_like_update[reply_id] += 1
            
            if all_reply_ids:
                mongo.db.reply_likes.delete_many({"reply_id": {"$in": all_reply_ids}})
            
            # Update likes_count on replies that user liked
            for reply_id, count in replies_needing_like_update.items():
                mongo.db.replies.update_one(
                    {"_id": reply_id},
                    {"$inc": {"likes_count": -count}}
                )
            
            # 8. Delete all replies
            if all_reply_ids:
                mongo.db.replies.delete_many({"_id": {"$in": all_reply_ids}})
            
            # Update replies_count on comments that had user's replies
            for comment_id, count in comments_needing_reply_update.items():
                mongo.db.comments.update_one(
                    {"_id": comment_id},
                    {"$inc": {"replies_count": -count}}
                )
            
            # Update comments_count on posts that had user's replies
            for post_id, count in posts_needing_reply_update.items():
                mongo.db.posts.update_one(
                    {"_id": post_id},
                    {"$inc": {"comments_count": -count}}
                )
            
            # 9. Update comments_count on posts that had user's comments
            # Need to do this BEFORE deleting comments to count replies correctly
            # Count replies to each user comment from the replies list we already have
            replies_per_comment = {}
            posts_with_replies_to_user_comments = {}
            for reply in replies_to_comments:
                comment_id = reply["comment_id"]
                post_id = reply["post_id"]
                if comment_id not in replies_per_comment:
                    replies_per_comment[comment_id] = 0
                replies_per_comment[comment_id] += 1
                # Track posts that have replies to user's comments (for count updates)
                if post_id not in posts_with_replies_to_user_comments:
                    posts_with_replies_to_user_comments[post_id] = 0
                posts_with_replies_to_user_comments[post_id] += 1
            
            # Update posts for user's comments (1 per comment)
            for comment in user_comments:
                post_id = comment["post_id"]
                mongo.db.posts.update_one(
                    {"_id": post_id},
                    {"$inc": {"comments_count": -1}}  # Subtract 1 for the comment
                )
            
            # Update posts for replies to user's comments (made by others)
            for post_id, count in posts_with_replies_to_user_comments.items():
                mongo.db.posts.update_one(
                    {"_id": post_id},
                    {"$inc": {"comments_count": -count}}
                )
            
            # Now delete all comments
            if all_comment_ids:
                mongo.db.comments.delete_many({"_id": {"$in": all_comment_ids}})
            
            # 10. Delete all notifications related to the user
            # - Notifications sent to the user (recipient_id)
            # - Notifications from the user (actor_id)
            # - Notifications related to user's posts (post_id in user's posts)
            # - Notifications related to user's comments/replies (comment_id/reply_id)
            notification_conditions = [
                {"recipient_id": user_oid},  # Notifications sent to user
                {"actor_id": user_oid}  # Notifications from user
            ]
            
            # Add conditions for posts, comments, and replies if they exist
            if post_ids:
                notification_conditions.append({"post_id": {"$in": post_ids}})
            if all_comment_ids:
                notification_conditions.append({"comment_id": {"$in": all_comment_ids}})
            if all_reply_ids:
                notification_conditions.append({"reply_id": {"$in": all_reply_ids}})
            
            notification_query = {"$or": notification_conditions}
            mongo.db.notifications.delete_many(notification_query)
            
            # 11. Delete all likes given by user (on other users' posts) and update counts
            user_likes = list(mongo.db.likes.find({"user_id": user_oid}))
            posts_needing_like_update = {}
            for like in user_likes:
                post_id = like["post_id"]
                if post_id not in posts_needing_like_update:
                    posts_needing_like_update[post_id] = 0
                posts_needing_like_update[post_id] += 1
            
            mongo.db.likes.delete_many({"user_id": user_oid})
            
            # Update likes_count on posts that user liked
            for post_id, count in posts_needing_like_update.items():
                mongo.db.posts.update_one(
                    {"_id": post_id},
                    {"$inc": {"likes_count": -count}}
                )
            
            # 12. Delete all posts
            if post_ids:
                posts_deleted_result = mongo.db.posts.delete_many({"_id": {"$in": post_ids}})
                logger.info(f"Deleted {posts_deleted_result.deleted_count} posts for user {user_id}")
                if posts_deleted_result.deleted_count != len(post_ids):
                    logger.warning(f"Expected to delete {len(post_ids)} posts but only deleted {posts_deleted_result.deleted_count}")
            else:
                logger.info(f"No posts to delete for user {user_id}")
            
            # 13. Finally, delete the user account
            result = mongo.db.users.delete_one({"_id": user_oid})
            
            if result.deleted_count == 0:
                logger.error(f"Failed to delete user account {user_id} - user not found or already deleted")
                return {"message": "Failed to delete account"}, 500
            
            logger.info(f"Account {user_id} deleted successfully - removed {len(file_ids_to_delete)} files, {len(post_ids)} posts, {len(all_comment_ids)} comments, {len(all_reply_ids)} replies, and all associated data")
            
            # Verify deletion by checking if user still exists
            verify_user = mongo.db.users.find_one({"_id": user_oid})
            if verify_user:
                logger.error(f"CRITICAL: User {user_id} still exists after deletion attempt!")
                return {"message": "Account deletion may have failed - user still exists"}, 500
            
            return {"message": "Account deleted successfully"}, 200
            
        except Exception as e:
            logger.error(f"Error deleting account for user {user_id}: {str(e)}", exc_info=True)
            return {"message": "Internal server error"}, 500
