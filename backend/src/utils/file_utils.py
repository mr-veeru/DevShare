"""
File Upload Utilities

Shared file upload functionality using MongoDB GridFS.
Used by both posts.py and profile.py to avoid code duplication.
"""

import uuid
from werkzeug.utils import secure_filename
from src.extensions import mongo
from src.logger import logger
from gridfs import GridFS
import datetime

# File upload configuration
ALLOWED_EXTENSIONS = {
    # Text files
    'txt', 'md', 'readme', 'log',
    # Documents
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    # Images
    'png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'webp',
    # Videos
    'mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv',
    # Archives
    'zip', 'rar', '7z', 'tar', 'gz',
    # Code files
    'py', 'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'scss', 'sass',
    'java', 'cpp', 'c', 'h', 'hpp', 'php', 'rb', 'go', 'rs',
    'swift', 'kt', 'scala', 'sh', 'bat', 'ps1',
    # Data files
    'json', 'xml', 'yaml', 'yml', 'csv', 'sql',
    # Executables
    'exe', 'msi', 'dmg', 'deb', 'rpm',
    # Other
    'ini', 'cfg', 'conf', 'env', 'gitignore', 'dockerfile'
}
MAX_FILE_SIZE = 16 * 1024 * 1024  # 16MB
MAX_TOTAL_UPLOAD_SIZE = 64 * 1024 * 1024  # 64MB per request (aggregate)

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def validate_file(file):
    """
    Validate a single file upload.
    
    Args:
        file: The uploaded file object
    
    Returns:
        tuple: (is_valid, error_message, file_data)
    """
    if not file or not file.filename:
        return True, None, None  # Skip empty files
    
    # Check file extension
    if not allowed_file(file.filename):
        return False, f"File type not allowed: {file.filename}", None
    
    # Check file size
    file.seek(0, 2)  # Seek to end
    file_size = file.tell()
    file.seek(0)  # Reset to beginning
    
    if file_size == 0:
        return False, f"Empty file not allowed: {file.filename}", None
    
    if file_size > MAX_FILE_SIZE:
        return False, f"File too large: {file.filename} ({file_size // (1024*1024)}MB). Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB", None
    
    # Secure filename
    filename = secure_filename(file.filename)
    if not filename:
        return False, f"Invalid filename: {file.filename}", None
    
    return True, None, {
        'file': file,
        'filename': filename,
        'file_size': file_size
    }

def upload_files_to_gridfs(files, user_id, max_files=10):
    """
    Upload multiple files to MongoDB GridFS.
    
    Args:
        files: List of uploaded file objects
        user_id: ID of the user uploading files
        max_files: Maximum number of files allowed (default: 10)
    
    Returns:
        tuple: (success, error_message, uploaded_files)
    """
    try:
        # Limit number of files
        if len(files) > max_files:
            return False, f"Cannot upload more than {max_files} files at once", []
        
        # Initialize GridFS
        fs = GridFS(mongo.db)
        uploaded_files = []
        total_size = 0
        
        for i, file in enumerate(files):
            # Validate file
            is_valid, error_msg, file_data = validate_file(file)
            
            if not is_valid:
                return False, error_msg, []
            
            if file_data is None:  # Skip empty files
                continue
            
            # Enforce aggregate upload size limit
            total_size += file_data['file_size']
            if total_size > MAX_TOTAL_UPLOAD_SIZE:
                return False, (
                    f"Total upload size exceeds limit: {(total_size // (1024*1024))}MB. "
                    f"Maximum total per request: {MAX_TOTAL_UPLOAD_SIZE // (1024*1024)}MB"
                ), []

            try:
                # Create unique filename
                unique_filename = f"{uuid.uuid4()}_{file_data['filename']}"
                
                # Store file in GridFS
                file_id = fs.put(
                    file_data['file'].read(),
                    filename=unique_filename,
                    content_type=getattr(file_data['file'], 'content_type', None),
                    metadata={
                        "original_name": file_data['filename'],
                        "user_id": user_id,
                        "uploaded_at": datetime.datetime.utcnow()
                    }
                )
                
                # Store file reference
                uploaded_files.append({
                    "file_id": str(file_id),
                    "filename": file_data['filename'],  # Use original filename for display
                    "unique_filename": unique_filename,  # Store unique filename for GridFS lookup
                    "content_type": getattr(file_data['file'], 'content_type', ''),
                    "size": file_data['file_size']
                })
                
                logger.info(f"File uploaded successfully: {file_data['filename']} by user {user_id}")
                
            except Exception as e:
                logger.error(f"Failed to upload file {file_data['filename']}: {str(e)}")
                return False, f"Failed to save file {file_data['filename']}: {str(e)}", []
        
        return True, None, uploaded_files
        
    except Exception as e:
        logger.error(f"Error in file upload process: {str(e)}")
        return False, f"File upload failed: {str(e)}", []

def get_file_from_gridfs(file_id):
    """
    Retrieve a file from GridFS.
    
    Args:
        file_id: The GridFS file ID
    
    Returns:
        tuple: (success, error_message, file_object)
    """
    try:
        from bson import ObjectId
        
        if not ObjectId.is_valid(file_id):
            return False, "Invalid file ID format", None
        
        fs = GridFS(mongo.db)
        file_obj = fs.get(ObjectId(file_id))
        
        if not file_obj:
            return False, "File not found", None
        
        return True, None, file_obj
        
    except Exception as e:
        logger.error(f"Error retrieving file {file_id}: {str(e)}")
        return False, f"Error retrieving file: {str(e)}", None

def download_file_from_post(post_id, file_id):
    """
    Download a file from a post with validation.
    
    Args:
        post_id: Post ID containing the file
        file_id: File ID to download
    
    Returns:
        tuple: (success, error_message, file_data, file_info)
    """
    try:
        from bson import ObjectId
        
        # Verify post exists
        post = mongo.db.posts.find_one({"_id": ObjectId(post_id)})
        if not post:
            return False, "Post not found", None, None
        
        # Find the file in the post
        file_info = None
        for file in post.get("files", []):
            if str(file["file_id"]) == file_id:
                file_info = file
                break
        
        if not file_info:
            return False, "File not found", None, None
        
        # Get file from GridFS
        success, error_msg, file_obj = get_file_from_gridfs(file_info["file_id"])
        if not success or not file_obj:
            return False, error_msg or "File not found in storage", None, None
        
        # Read file data
        file_data = file_obj.read()
        
        # Ensure file_data is bytes
        if isinstance(file_data, str):
            file_data = file_data.encode('utf-8')
        elif not isinstance(file_data, bytes):
            file_data = bytes(file_data)
        
        return True, None, file_data, file_info
        
    except Exception as e:
        logger.error(f"Error downloading file {file_id} from post {post_id}: {str(e)}")
        return False, f"Error downloading file: {str(e)}", None, None
