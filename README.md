# DevShare

A full-stack social platform for developers to share projects, connect, and collaborate.

## Overview

DevShare is a modern social networking platform built specifically for developers to share their projects, ask for help, and connect with other developers. The application provides a rich interactive experience with features like posts, comments, likes, user profiles, and project sharing.

## Features

### User Management
- **Authentication**: Secure user registration, login, and profile management
- **User Profiles**: Customizable profiles showcasing skills, projects, and activity metrics
- **Settings**: Account customization with profile editing and password management

### Social Features
- **Social Feed**: Interactive news feed with real-time post loading and infinite scroll
- **Posts & Projects**: Share development projects with title, description, and GitHub links
- **Skills Tagging**: Color-coded and icon-enhanced skill tags for better discovery
- **Advanced Search**: Search posts by title, description, or skills
- **Like System**: Like posts to show appreciation and save favorites

### Enhanced Comment System
- **Threaded Comments**: Support for nested replies in comment threads
- **Real-time Updates**: Comments update in real-time without page refresh
- **Comment Management**: Edit and delete functionality for your own comments
- **Pagination Controls**: "Show more/less comments" to manage content density
- **Owner Indicators**: Clear visuals showing which comments are yours

### Notifications
- **Interaction Alerts**: Get notified about likes, comments, and replies
- **Context-Rich**: Notifications include the relevant post and action context
- **Real-time Updates**: Instant notification delivery
- **Clear Status**: Read/unread indicators

### Sharing & Collaboration
- **Social Sharing**: Share projects to X (Twitter), WhatsApp, LinkedIn, Facebook
- **GitHub Integration**: Link projects directly to GitHub repositories
- **Copy Link**: Easily copy direct links to share across platforms

### UI/UX
- **Responsive Design**: Fully responsive UI for all device sizes
- **Modern Interface**: Clean, intuitive design with consistent interactions
- **Accessibility**: ARIA labels and keyboard navigation support
- **Interactive Elements**: Hover effects and visual feedback
- **Letter Avatars**: Personalized user avatars with color gradients

## Tech Stack

### Frontend

- **Framework**: React (TypeScript)
- **Routing**: React Router
- **State Management**: React Hooks & Context
- **Form Handling**: React Hook Form with Yup validation
- **Authentication**: Firebase Authentication
- **Styling**: CSS with responsive design
- **Icons**: React Icons (Font Awesome)
- **Notifications**: React Toastify
- **Date Formatting**: date-fns

### Backend

- **Framework**: Flask (Python)
- **Authentication**: Firebase Auth token verification
- **Database**: Firestore (Firebase)
- **API**: RESTful API design
- **CORS**: Cross-Origin Resource Sharing support
- **Environment**: Configurable via dotenv
- **Error Handling**: Standardized error responses

## Project Structure

```
├── frontend/               # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   │   └── common/     # Shared components like Avatars, Dialogs
│   │   ├── config/         # Configuration files & Firebase setup
│   │   ├── pages/          # Page components
│   │   │   ├── auth/       # Authentication pages
│   │   │   ├── createPost/ # Post creation interface
│   │   │   ├── feed/       # Main feed & post interaction
│   │   │   ├── profile/    # User profiles & activity
│   │   │   ├── settings/   # User settings management
│   │   │   └── notifications/ # Notification center
│   │   ├── services/       # API and service integrations
│   │   ├── styles/         # CSS stylesheets
│   │   ├── types/          # TypeScript type definitions
│   │   ├── App.tsx         # Main application component
│   │   └── index.tsx       # Application entry point
│   ├── public/             # Static assets
│   └── package.json        # Frontend dependencies
│
├── backend/                # Flask backend application
│   ├── app/
│   │   ├── routes/         # API route definitions
│   │   │   ├── auth.py     # Authentication endpoints
│   │   │   ├── comments.py # Comment & reply management
│   │   │   ├── posts.py    # Post CRUD operations
│   │   │   └── users.py    # User profile management
│   │   ├── services/       # Business logic services
│   │   ├── utils/          # Helper utilities
│   │   └── __init__.py     # Flask app factory
│   ├── run.py              # Application entry point
│   └── requirements.txt    # Python dependencies
│
├── firebase.json           # Firebase configuration
└── .firebaserc             # Firebase project settings
```

## Key Feature Details

### Advanced Skill Tag System
- **Color-coded Categories**: Skills are color-coded based on their first letter
- **Custom Icons**: Popular technologies have unique icons (React, Python, JavaScript, etc.)
- **Interactive Styling**: Hover effects for better engagement
- **Consistent Design**: Skill tags are styled consistently throughout the platform

### Interactive Post System
- **Rich Content**: Support for detailed project descriptions
- **GitHub Integration**: Direct links to repositories
- **Interactive Actions**: Like, comment, and share functionality
- **Owner Controls**: Edit and delete options for your own posts
- **Optimistic UI Updates**: UI updates immediately before server confirmation

### Comprehensive Comment System
- **Nested Replies**: Support for multi-level discussions
- **Comment Controls**: Edit, delete options for your comments
- **Responsive Design**: Adapts to all screen sizes
- **Load Management**: Show more/less functionality to manage large threads

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- Python (v3.8 or higher)
- Firebase account

### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start development server:
   ```
   npm start
   ```

### Backend Setup

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Create and activate a virtual environment:
   ```
   # Windows
   python -m venv venv
   venv\Scripts\activate
   
   # macOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Create a `.env` file with your Firebase credentials:
   ```
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_PRIVATE_KEY_ID=your-private-key-id
   FIREBASE_PRIVATE_KEY=your-private-key
   FIREBASE_CLIENT_EMAIL=your-client-email
   FIREBASE_CLIENT_ID=your-client-id
   FIREBASE_CLIENT_CERT_URL=your-client-cert-url
   ```

5. Run the application:
   ```
   python run.py
   ```

## Deployment

The application is configured for Firebase hosting and can be deployed using the Firebase CLI.

## Future Enhancements

Planned features for upcoming releases:
- Real-time chat between developers
- Code snippet sharing with syntax highlighting
- Project collaboration tools
- Enhanced analytics for post engagement
- Mobile application

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License. 