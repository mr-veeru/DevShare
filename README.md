# DevSharee - Social Platform for Developers

A full-stack social platform for developers to create, share, and interact with projects. Built with Flask backend and React TypeScript frontend, featuring JWT authentication, real-time notifications, and file management.

## Key Highlights

- **Full-Stack Application**: RESTful API with Flask backend and modern React frontend
- **Production-Ready**: JWT authentication with refresh token rotation, Redis-backed token revocation, Redis-backed rate limiting, error handling, database indexing
- **Real-Time Social Features**: Likes, comments, and replies with instant notification updates
- **File Management**: Secure file uploads/downloads with MongoDB Atlas and GridFS
- **Modern UI/UX**: Responsive design with light/dark theme, glass-morphism effects, consolidated CSS patterns
- **Clean Architecture**: Modular codebase with custom hooks, centralized utilities, and reusable components

## Architecture Overview

```
DevSharee/
├── 📁 backend/                         # Flask REST API
│   ├── 📄 app.py                       # Main application entry
│   ├── 📄 requirements.txt             # Python dependencies
│   └── 📁 src/
│       ├── 📄 config.py                # Environment configuration
│       ├── 📄 extensions.py            # Flask extensions (MongoDB, JWT, API)
│       ├── 📄 logger.py                # Logging configuration
│       ├── 📁 database/                # Database configuration
│       │   └── 📄 indexes.py           # MongoDB index initialization
│       ├── 📁 routes/                  # API endpoints
│       │   ├── 📄 __init__.py          # Routes package initialization & error handlers
│       │   ├── 📄 auth.py              # Authentication (register, login, logout, refresh)
│       │   ├── 📄 health.py            # System health monitoring
│       │   ├── 📄 posts.py             # Post creation with file uploads
│       │   ├── 📄 feed.py              # Public post discovery, search & file downloads
│       │   ├── 📄 profile.py           # User profile & post management
│       │   ├── 📄 notifications.py     # Notifications management
│       │   └── 📁 social/              # Social interactions
│       │       ├── 📄 __init__.py      # Social package initialization
│       │       ├── 📄 likes.py         # Post likes management
│       │       ├── 📄 comments.py      # Comment management
│       │       └── 📄 replies.py       # Reply management
│       └── 📁 utils/                   # Utility functions
│           ├── 📄 __init__.py          # Utils package initialization
│           ├── 📄 file_utils.py        # File upload/download helpers
│           └── 📄 social_utils.py      # Social interaction helpers
├── 📁 frontend/                        # React TypeScript App
│   ├── 📄 package.json                 # Node dependencies
│   └── 📁 src/
│       ├── 📄 App.tsx                  # App shell, routing
│       ├── 📄 index.css                # Global styles (top/bottom navbar spacing)
│       ├── 📄 index.tsx                # Application entry point
│       ├── 📁 types/                   # Shared TypeScript definitions
│       │   └── 📄 index.ts             # Centralized type definitions
│       ├── 📁 hooks/                   # Custom React hooks
│       │   ├── 📄 useAuth.ts           # Authentication state management
│       │   └── 📄 useNotifications.ts  # Notification count management
│       ├── 📁 components/
│       │   ├── 📁 navbar/              # Responsive top/bottom navigation
│       │   │   ├── 📄 Navbar.tsx
│       │   │   └── 📄 Navbar.css
│       │   └── 📁 common/              # Reusable UI components & shared styles
│       │       ├── 📄 common.css       # Consolidated shared styles (buttons, inputs, modals, forms)
│       │       ├── 📁 PostCard/        # Post display with social features
│       │       │   ├── 📄 PostCard.tsx
│       │       │   └── 📄 PostCard.css
│       │       ├── 📁 LetterAvatar/     # User avatar with initials
│       │       │   ├── 📄 LetterAvatar.tsx
│       │       │   └── 📄 LetterAvatar.css
│       │       ├── 📁 FilePreview/     # File preview component
│       │       │   └── 📄 FilePreview.tsx
│       │       ├── 📁 ConfirmModal/    # Reusable confirmation modal
│       │       │   └── 📄 ConfirmModal.tsx
│       │       ├── 📁 Toast/           # Toast notification system
│       │       │   ├── 📄 Toast.tsx
│       │       │   └── 📄 Toast.css
│       │       ├── 📁 ThemeToggle/     # Theme context & toggle component
│       │       │   ├── 📄 ThemeToggle.tsx
│       │       │   └── 📄 ThemeToggle.css
│       │       └── 📁 Social/          # Social interaction components
│       │           ├── 📄 Likes.tsx
│       │           ├── 📄 Likes.css
│       │           ├── 📄 Comments.tsx
│       │           ├── 📄 Comments.css
│       │           ├── 📄 Reply.tsx
│       │           └── 📄 Reply.css
│       ├── 📁 pages/                   # Route-level pages
│       │   ├── 📁 Feed/                # Main feed page
│       │   │   ├── 📄 Feed.tsx
│       │   │   └── 📄 Feed.css
│       │   ├── 📁 CreatePost/          # Post creation page
│       │   │   ├── 📄 CreatePost.tsx
│       │   │   └── 📄 CreatePost.css
│       │   ├── 📁 Notifications/       # Notifications page
│       │   │   ├── 📄 Notifications.tsx
│       │   │   └── 📄 Notifications.css
│       │   ├── 📁 PostView/            # Single post view page
│       │   │   └── 📄 PostView.tsx
│       │   ├── 📁 Profile/             # User profile page
│       │   │   ├── 📄 Profile.tsx
│       │   │   ├── 📄 Profile.css
│       │   │   ├── 📄 EditProfile.tsx  # Profile editing page
│       │   │   └── 📄 EditProfile.css  # Profile editing styles
│       │   └── 📁 auth/                # Authentication pages
│       │       ├── 📄 Login.tsx
│       │       ├── 📄 Signup.tsx
│       │       └── 📄 Auth.css
│       └── 📁 utils/                   # Frontend utilities
│           ├── 📄 auth.ts              # Authentication utilities
│           ├── 📄 date.ts              # Shared date formatting (relative & UI formats)
│           ├── 📄 fileUtils.tsx        # File handling utilities
│           └── 📄 postView.tsx         # Post view utilities
├── 📄 .gitignore                       # Git ignore rules
└── 📄 README.md                        # Project documentation
```

## Quick Start

### Backend (Flask API)
```bash
cd backend
pip install -r requirements.txt
python app.py  # Runs on http://localhost:5000
```

### Frontend (React App)
```bash
cd frontend
npm install
npm start      # Runs on http://localhost:3000
```

## API Documentation

📖 **Complete API Reference**: See [backend/API.md](backend/API.md) for detailed endpoint documentation.
🔍 **Interactive Swagger UI**: Visit `http://localhost:5000/api/swagger-ui/` for interactive API testing and documentation.

### API Overview
- **Authentication**: Register, login, logout, refresh token rotation
- **Posts & Feed**: Create posts, discover content, file management
- **Social**: Likes, comments, replies with nested interactions
- **Profile**: User management, post CRUD operations, account deletion with cascade cleanup
- **Notifications**: Real-time notification system
- **System**: Health checks and monitoring

## Tech Stack

**Backend:** Flask 2.3.3 | MongoDB Atlas (GridFS) | Redis 5.0.1 | PyMongo 4.6.0 | Flask-JWT-Extended | Flask-RESTX 1.3.0 | Flask-CORS 6.0.1 | Flask-Limiter 3.8.0
**Frontend:** React 19 | TypeScript | React Router 7 | React Icons | Custom Hooks (`useAuth`, `useNotifications`) | Native Fetch API | CSS Variables | Consolidated Styles

## Environment Configuration

Create `backend/.env`:
```env
# Required
SECRET_KEY=your_secret_key_here
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/devshare
JWT_SECRET_KEY=your_jwt_secret_here

# CORS Configuration (comma-separated for multiple origins)
# Leave empty for development (allows all origins) or specify:
# Development: http://localhost:3000,http://192.168.1.100:3000
# Production: https://yourdomain.com,https://www.yourdomain.com
# CORS_ORIGINS=http://localhost:3000

# Redis Configuration (optional - for production rate limiting & token revocation)
# If not set, uses in-memory storage for both
RATELIMIT_STORAGE_URL=redis://localhost:6379/0

# Environment
FLASK_ENV=development
DEBUG=True
```

## Features

### **Core Functionality**
- 🔐 **Authentication**: JWT-based auth with refresh token rotation, Redis-backed token revocation, and secure session management
- 👤 **Profile Management**: User profiles with bio, password change, account deletion with cascade cleanup, and statistics
- 📝 **Post Management**: Create, edit, delete posts with file uploads and rich content
- 💬 **Social Interactions**: Like posts, comments, and replies with real-time updates and notifications
- 🔍 **Feed Discovery**: Browse, search, and filter posts with pagination
- 📁 **File Management**: Secure file uploads/downloads with MongoDB Atlas and GridFS
- 🗑️ **Account Deletion**: Permanent account deletion with cascade cleanup of all user data (posts, files, social interactions, notifications)

### **Technical Highlights**
- 📚 **API Documentation**: Swagger/OpenAPI integration for interactive testing
- 🏥 **Health Monitoring**: System health checks and monitoring endpoints
- 🔒 **Security**: Redis-backed rate limiting & token revocation (with in-memory fallback), input validation, file validation
- ⚡ **Performance**: MongoDB indexing, pagination, optimized database queries
- 🎨 **Code Quality**: Custom React hooks, centralized utilities, consolidated CSS patterns
- 🎯 **UI/UX**: Responsive design, light/dark theme, glass-morphism effects, toast notifications

## Use Cases

- **Developer Portfolios**: Showcase projects with code and documentation
- **Tech Communities**: Share knowledge and collaborate
- **Project Discovery**: Find interesting projects by technology stack
- **Social Learning**: Learn from others' implementations
- **Team Collaboration**: Share work-in-progress projects

## 📞 Contact

**Bannuru Veerendra**

<div align="center">
  <a href="https://github.com/mr-veeru">
    <img src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"/>
  </a>
  <a href="https://www.linkedin.com/in/veerendra-bannuru-900934215">
    <img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn"/>
  </a>
  <a href="mailto:mr.veeru68@gmail.com">
    <img src="https://img.shields.io/badge/Gmail-D14836?style=for-the-badge&logo=gmail&logoColor=white" alt="Gmail"/>
  </a>
</div>