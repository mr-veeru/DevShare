"""
Database Indexes Initialization

Creates database indexes for frequently queried fields to improve query performance.
All indexes are created with background=True to avoid blocking operations.
"""

from src.extensions import mongo
from src.logger import logger


def initialize_database_indexes():
    """
    Create database indexes for frequently queried fields to improve query performance.
    This is called once when the app starts.
    
    All indexes are created with background=True to avoid blocking database operations.
    Errors are handled gracefully as indexes may already exist.
    """
    try:
        # Users collection indexes
        # Index for email (used in login)
        mongo.db.users.create_index("email", unique=True, background=True)
        # Index for username (used in login and lookups)
        mongo.db.users.create_index("username", unique=True, background=True)
        # Index for status (used to filter active users)
        mongo.db.users.create_index("status", background=True)
        
        # Posts collection indexes
        # Index for user_id (used in profile posts)
        mongo.db.posts.create_index("user_id", background=True)
        # Index for created_at (used in feed sorting)
        mongo.db.posts.create_index("created_at", background=True)
        # Index for tech_stack (used in filtering)
        mongo.db.posts.create_index("tech_stack", background=True)
        # Indexes for search queries (title and description - used in regex searches)
        mongo.db.posts.create_index("title", background=True)
        mongo.db.posts.create_index("description", background=True)
        
        # Notifications collection indexes
        # Compound index for recipient_id and read (used in unread count and listing)
        mongo.db.notifications.create_index([("recipient_id", 1), ("read", 1)], background=True)
        # Index for created_at (used in sorting)
        mongo.db.notifications.create_index("created_at", background=True)
        # Index for recipient_id (used in queries)
        mongo.db.notifications.create_index("recipient_id", background=True)
        # Compound index for notification deletion (recipient_id, actor_id, type)
        mongo.db.notifications.create_index([("recipient_id", 1), ("actor_id", 1), ("type", 1)], background=True)
        
        # Likes collection indexes
        # Compound index for user_id and post_id (used in like status checks)
        mongo.db.likes.create_index([("user_id", 1), ("post_id", 1)], unique=True, background=True)
        # Index for post_id (used to get all likes for a post)
        mongo.db.likes.create_index("post_id", background=True)
        
        # Comments collection indexes
        # Index for post_id (used to get all comments for a post)
        mongo.db.comments.create_index("post_id", background=True)
        # Index for user_id (used in profile queries)
        mongo.db.comments.create_index("user_id", background=True)
        # Index for created_at (used in sorting)
        mongo.db.comments.create_index("created_at", background=True)
        
        # Comment likes collection indexes
        # Compound index for user_id and comment_id (used in like status checks)
        mongo.db.comment_likes.create_index([("user_id", 1), ("comment_id", 1)], unique=True, background=True)
        # Index for comment_id (used to get all likes for a comment)
        mongo.db.comment_likes.create_index("comment_id", background=True)
        
        # Replies collection indexes
        # Index for comment_id (used to get all replies for a comment)
        mongo.db.replies.create_index("comment_id", background=True)
        # Index for user_id (used in profile queries)
        mongo.db.replies.create_index("user_id", background=True)
        # Index for created_at (used in sorting)
        mongo.db.replies.create_index("created_at", background=True)
        
        # Reply likes collection indexes
        # Compound index for user_id and reply_id (used in like status checks)
        mongo.db.reply_likes.create_index([("user_id", 1), ("reply_id", 1)], unique=True, background=True)
        # Index for reply_id (used to get all likes for a reply)
        mongo.db.reply_likes.create_index("reply_id", background=True)
        
        logger.info("Database indexes initialized successfully")
    except Exception as e:
        # Log error but don't crash the app - indexes may already exist
        logger.warning(f"Error initializing database indexes (they may already exist): {str(e)}")

