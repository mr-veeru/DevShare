"""
Posts Creation Routes

Handles creating new project posts with file uploads using MongoDB GridFS.

Endpoints:
- POST /posts (with file upload)
"""

from flask import request
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.extensions import mongo, limiter
from src.logger import logger
from src.utils import upload_files_to_gridfs
import datetime
from bson import ObjectId

# Namespace
posts_ns = Namespace("posts", description="Project posts creation operations")

# Swagger models
post_model = posts_ns.model("Post", {
    "title": fields.String(required=True, description="Project title (REQUIRED)", min_length=1, max_length=200),
    "description": fields.String(required=True, description="Project description (REQUIRED)", min_length=1, max_length=2000),
    "tech_stack": fields.List(fields.String, required=True, description="Technologies used (REQUIRED - array of strings)", min_items=1, max_items=20),
    "github_link": fields.String(required=False, description="GitHub repository URL (OPTIONAL)", pattern="^https://github\\.com/.*"),
    "files": fields.List(fields.Raw, required=False, description="Project files (OPTIONAL - max 10 files, 16MB each)")
})

post_response_model = posts_ns.model("PostResponse", {
    "id": fields.String(description="Post ID"),
    "title": fields.String(description="Project title"),
    "description": fields.String(description="Project description"),
    "tech_stack": fields.List(fields.String),
    "github_link": fields.String,
    "files": fields.List(fields.Nested(posts_ns.model("FileInfo", {
        "file_id": fields.String(description="File ID in GridFS"),
        "filename": fields.String(description="Original filename"),
        "content_type": fields.String(description="File MIME type"),
        "size": fields.Integer(description="File size in bytes")
    }))),
    "user_id": fields.String(description="User who created the post"),
    "likes_count": fields.Integer(description="Number of likes"),
    "comments_count": fields.Integer(description="Number of comments"),
    "created_at": fields.String(description="Post creation time")
})

# ---------- Routes ----------
@posts_ns.route("")
class PostCreate(Resource):
    @jwt_required()
    @limiter.limit("10 per hour")  # Prevent spam posts
    def post(self):
        """
        Create a new project post with file uploads using MongoDB GridFS.

        Required Fields:
        - title: Project title (1-200 chars)
        - description: Project description (1-2000 chars) 
        - tech_stack: Array of technologies (1-20 items)

        Optional Fields:
        - github_link: GitHub repository URL (must be valid GitHub URL)
        - files: Multiple file uploads (max 10 files, 16MB each)
        """
        try:
            user_id = get_jwt_identity()
            
            # Get form data
            title = request.form.get("title", "").strip()
            description = request.form.get("description", "").strip()
            tech_stack = request.form.getlist("tech_stack")  # Get as list of strings
            github_link = request.form.get("github_link", "").strip()
            
            # Handle tech_stack if sent as comma-separated string
            if tech_stack and len(tech_stack) == 1 and ',' in tech_stack[0]:
                tech_stack = [tech.strip() for tech in tech_stack[0].split(',') if tech.strip()]
            
            # Check for unexpected fields
            allowed_fields = {"title", "description", "tech_stack", "github_link", "files"}
            provided_fields = set(request.form.keys())
            unexpected_fields = provided_fields - allowed_fields
            
            if unexpected_fields:
                return {
                    "message": f"Unexpected fields: {', '.join(unexpected_fields)}",
                    "allowed_fields": list(allowed_fields)
                }, 400
            
            # Validate required fields
            if not title or not description:
                return {"message": "Title and description are required"}, 400
                
            # Validate tech_stack
            if not tech_stack or len(tech_stack) > 20:
                return {"message": "Tech stack must have 1-20 technologies"}, 400
                
            # Validate tech stack items
            for i, tech in enumerate(tech_stack):
                if not tech or not tech.strip():
                    return {"message": f"Tech stack item {i+1} cannot be empty"}, 400
            
            # Validate GitHub link format if provided
            if github_link and not github_link.startswith("https://github.com/"):
                return {"message": "GitHub link must be a valid GitHub repository URL"}, 400
            
            # Handle file uploads using shared utility
            uploaded_files = []
            if 'files' in request.files:
                files = request.files.getlist('files')
                
                success, error_msg, uploaded_files = upload_files_to_gridfs(files, user_id, max_files=10)
                if not success:
                    return {"message": error_msg}, 400
            
            # Create post document
            post = {
                "title": title,
                "description": description,
                "tech_stack": tech_stack,
                "github_link": github_link,
                "files": uploaded_files,
                "user_id": ObjectId(user_id),
                "likes_count": 0,
                "comments_count": 0,
                "created_at": datetime.datetime.utcnow()
            }
            
            # Insert into database
            result = mongo.db.posts.insert_one(post)
            logger.info(f"Post created by user {user_id}: {title}")
            
            # Prepare response - convert ObjectId to string
            post["id"] = str(result.inserted_id)
            post["user_id"] = str(post["user_id"])
            post["created_at"] = post["created_at"].isoformat()
            
            # Remove the original _id field to avoid confusion
            if "_id" in post:
                del post["_id"]
            
            return post, 201
            
        except Exception as e:
            logger.error(f"Error creating post: {str(e)}", exc_info=True)
            return {"message": f"Error creating post: {str(e)}"}, 500

