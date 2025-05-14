# DevShare

A React social platform for developers to share projects, connect, and collaborate.

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
- **Like System**: Like posts to show appreciation

### Enhanced Comment System
- **Threaded Comments**: Support for nested replies in comment threads
- **Comment Pagination**: "Show more/less comments" controls to manage content density
- **Real-time Updates**: Comments update in real-time without page refresh
- **Comment Management**: Edit and delete functionality for your own comments
- **Owner Indicators**: Clear visuals showing which comments are yours
- **Complete Deletion**: Comments and replies are fully removed when deleted

### Comprehensive Notification System
- **Interaction Alerts**: Get notified about likes, comments, and replies
- **Context-Rich**: Notifications include the post title and comment content
- **Multiple Recipients**: Both post owners and comment owners get notifications for replies
- **Cleanup on Deletion**: Notifications are removed when associated content is deleted
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

### Frontend & Backend
- **Framework**: React (TypeScript)
- **Routing**: React Router
- **State Management**: React Hooks & Context
- **Form Handling**: React Hook Form with Yup validation
- **Authentication**: Firebase Authentication
- **Database**: Firestore (Firebase)
- **Storage**: Firebase Storage
- **Hosting**: Firebase Hosting
- **Styling**: CSS with responsive design
- **Icons**: React Icons (Font Awesome)
- **Notifications**: React Toastify
- **Date Formatting**: date-fns

## Project Structure

```
├── public/                # Static assets
│   ├── logos/             # Application logos
│   ├── index.html         # Main HTML file
│   ├── manifest.json      # PWA manifest
│   └── robots.txt         # SEO robots file
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── common/        # Shared components (ErrorBoundary, LoadingSpinner, etc.)
│   │   └── navbar/        # Navigation components
│   ├── config/            # Configuration files & Firebase setup
│   ├── pages/             # Page components
│   │   ├── auth/          # Authentication pages
│   │   ├── createPost/    # Post creation interface
│   │   ├── feed/          # Main feed & post interaction
│   │   ├── profile/       # User profiles & activity
│   │   ├── settings/      # User settings management
│   │   └── notifications/ # Notification center
│   ├── services/          # API services and Firebase integration
│   ├── styles/            # CSS stylesheets
│   ├── types/             # TypeScript type definitions
│   ├── App.tsx            # Main application component
│   └── index.tsx          # Application entry point
├── build/                 # Production build output
├── node_modules/          # Dependencies
├── firebase.json          # Firebase configuration
├── firestore.rules        # Firestore security rules
├── firestore.indexes.json # Firestore indexes
├── .firebaserc            # Firebase project settings
├── package.json           # Project dependencies and scripts
└── tsconfig.json          # TypeScript configuration
```

## Key Feature Details

### Advanced Skill Tag System
- **Color-coded Categories**: Skills are color-coded based on their first letter
- **Custom Icons**: Popular technologies have unique icons (React, Python, JavaScript, etc.)
- **Interactive Styling**: Hover effects for better engagement
- **Consistent Design**: Same skill tag styling used across posts and profiles

### Interactive Post System
- **Rich Content**: Support for detailed project descriptions
- **GitHub Integration**: Direct links to repositories
- **Interactive Actions**: Like, comment, and share functionality
- **Owner Controls**: Edit and delete options for your own posts
- **Optimistic UI Updates**: UI updates immediately before server confirmation

### Multi-level Comment System
- **Nested Replies**: Full support for threaded discussions
- **Comment Controls**: Edit, delete options for your comments
- **Responsive Design**: Adapts to all screen sizes
- **Load Management**: Show more/less functionality to manage large threads
- **Full Deletion**: Comments and replies are completely removed when deleted
- **Content Preview**: Comment content visible in notifications for context

### Smart Notification System
- **Comprehensive Alerts**: Notifications for likes, comments, replies, and comment likes
- **Dual Recipients**: Both post owners and comment owners receive notifications
- **Content Context**: Shows the post title and relevant comment text
- **Proper Management**: Delete notifications when content is deleted
- **Clear Visual Indicators**: Unread status and contextual icons

## Getting Started

### Prerequisites

- Firebase account

### Setup

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/devshare.git
   cd devshare
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start development server:
   ```
   npm start
   ```

4. Deploy to Firebase:
   ```
   npm run deploy
   ```

## Firebase Configuration

Before running the application, you'll need to set up Firebase:

1. Create a Firebase project at [firebase.google.com](https://firebase.google.com)
2. Enable Firebase Authentication with email/password and Google sign-in
3. Set up Firestore Database with appropriate security rules
4. Configure Firebase Storage for user uploads
5. Update the Firebase configuration in `src/config/firebase.ts`

## Future Enhancements

Planned features for upcoming releases:
- Real-time chat between developers
- Code snippet sharing with syntax highlighting
- Project collaboration tools
- Enhanced analytics for post engagement
- Mobile application

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

