# DevSharee API Reference

Complete API documentation for the DevSharee backend.

## Base URL
```
http://localhost:5000/api
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <access_token>
```

### **Authentication** (`/api/auth/`)
- `POST /register` - User registration with validation
- `POST /login` - User authentication (username/email + password)
- `POST /logout` - Token blacklisting
- `POST /refresh` - Refresh token rotation

## Posts

### **Posts** (`/api/posts/`)
- `POST /` - Create post with file uploads (multipart/form-data)

## Feed

### **Feed** (`/api/feed/`)
- `GET /` - Discover posts (pagination, search, filtering)
- `GET /<post_id>` - Get detailed post with social data
- `GET /posts/<post_id>/files/<file_id>` - Download files from posts

## Notifications

### **Notifications** (`/api/notifications/`)
- `GET /` - List notifications (paginated, newest first)
- `GET /unread_count` - Get unread notifications count
- `POST /mark_all_read` - Mark all as read
- `POST /<notif_id>/read` - Mark one as read
- `DELETE /<notif_id>` - Delete one notification
- `POST /clear_all` - Delete all notifications

## Social Interactions

### **Likes** (`/api/social/likes/`)
- `POST /posts/<post_id>/like` - Toggle like/unlike
- `GET /posts/<post_id>/likes` - Get all likes with user info

### **Comments** (`/api/social/comments/`)
- `POST /posts/<post_id>/comments` - Add comment
- `GET /posts/<post_id>/comments` - Get all comments with replies
- `PUT /<comment_id>` - Edit comment (author only)
- `DELETE /<comment_id>` - Delete comment + replies (author/post owner)
- `GET /<comment_id>/likes` - List who liked a comment
- `POST /<comment_id>/likes` - Toggle like/unlike a comment → `{ liked, likes_count }`

### **Replies** (`/api/social/replies/`)
- `POST /comments/<comment_id>/replies` - Add reply
- `GET /comments/<comment_id>/replies` - Get all replies
- `PUT /<reply_id>` - Edit reply (author only)
- `DELETE /<reply_id>` - Delete reply (author/post owner)
- `GET /<reply_id>/likes` - List who liked a reply
- `POST /<reply_id>/likes` - Toggle like/unlike a reply → `{ liked, likes_count }`

## Profile

### **Profile** (`/api/profile/`)
- `GET /` - Get user profile with stats
- `PUT /` - Update user profile (fullname, username, email, bio)
- `PUT /change-password` - Change user password (requires current password, new password, confirm password)
- `DELETE /delete-account` - Delete user account (requires password confirmation)
- `GET /posts` - Get user's posts (paginated)
- `GET /posts/<post_id>` - Get specific post details
- `PUT /posts/<post_id>` - Edit user's post
- `DELETE /posts/<post_id>` - Delete user's post
- `GET /posts/<post_id>/files/<file_id>` - Download files
- `GET /users/<user_id>` - Get public user profile by ID

## System

### **System** (`/api/health/`)
- `GET /` - Comprehensive health check (database, JWT, config)

## Interactive API Documentation

For interactive API testing and documentation, visit:
```
http://localhost:5000/api/swagger-ui/
```

