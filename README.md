# DevShare

A full-stack social platform for developers to share projects, connect, and collaborate.

## Overview

DevShare is a modern social networking platform built specifically for developers to share their projects, ask for help, and connect with other developers. The application provides a rich interactive experience with features like posts, comments, likes, user profiles, and project sharing.

## Features

- **User Authentication**: Secure user registration, login, and profile management
- **Social Feed**: Interactive news feed with real-time post loading and infinite scroll
- **Posts & Projects**: Share development projects with title, description, and GitHub links
- **Skills Tagging**: Tag posts with relevant skills for better discovery
- **Advanced Search**: Search posts by title, description, or skills
- **Commenting System**: Engage with other users through comments
- **Notifications**: Stay updated on interactions with your content
- **Responsive Design**: Fully responsive UI for all device sizes

## Tech Stack

### Frontend

- **Framework**: React (TypeScript)
- **Routing**: React Router
- **State Management**: React Hooks & Context
- **Form Handling**: React Hook Form with Yup validation
- **Authentication**: Firebase Authentication
- **Styling**: CSS with responsive design
- **Notifications**: React Toastify

### Backend

- **Framework**: Flask (Python)
- **Authentication**: Firebase Auth token verification
- **Database**: Firestore (Firebase)
- **API**: RESTful API design
- **CORS**: Cross-Origin Resource Sharing support
- **Environment**: Configurable via dotenv

## Project Structure

```
├── frontend/               # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── config/         # Configuration files
│   │   ├── pages/          # Page components
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
│   │   ├── services/       # Business logic services
│   │   ├── utils/          # Helper utilities
│   │   └── __init__.py     # Flask app factory
│   ├── run.py              # Application entry point
│   └── requirements.txt    # Python dependencies
│
├── firebase.json           # Firebase configuration
└── .firebaserc             # Firebase project settings
```

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


## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 