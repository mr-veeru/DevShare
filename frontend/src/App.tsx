/**
 * Main Application Component
 * Handles authentication state management, routing, and core app functionality.
 */

import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import Navbar from './components/navbar/Navbar';
import Feed from './pages/Feed/Feed';
import CreatePost from './pages/CreatePost/CreatePost';
import Notifications from './pages/Notifications/Notifications';
import Profile from './pages/Profile/Profile';
import EditProfile from './pages/Profile/EditProfile';
import { PostViewPage } from './pages/PostView/PostView';
import { ToastProvider, useToast } from './components/common/Toast/Toast';
import { ThemeProvider } from './components/common/ThemeToggle/ThemeToggle';
import { useAuth } from './hooks/useAuth';
import { useNotifications } from './hooks/useNotifications';

function AppContent() {
  const [isLogin, setIsLogin] = useState(true);
  const { isAuthenticated, user, handleLoginSuccess, handleLogout } = useAuth();
  const { unreadCount, refreshNotificationCount } = useNotifications(isAuthenticated);
  const { showSuccess } = useToast();

  if (!isAuthenticated) {
    return (
      <div className="app">
        {isLogin ? (
          <Login onSwitchToSignup={() => setIsLogin(false)} onLoginSuccess={handleLoginSuccess} />
        ) : (
          <Signup onSwitchToLogin={() => setIsLogin(true)} onSignupSuccess={handleLoginSuccess} />
        )}
      </div>
    );
  }

  return (
    <Router>
      <div className="app main-app">
        <Navbar 
          user={user} 
          onLogout={async () => { await handleLogout(); showSuccess('Logged out successfully!'); }} 
          unreadCount={unreadCount} 
        />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/feed" replace />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/signup" element={<Navigate to="/" replace />} />
            <Route path="/feed" element={<Feed />} />
            <Route path="/post/:id" element={<PostViewPage />} />
            <Route path="/create" element={<CreatePost />} />
            <Route path="/notifications" element={<Notifications unreadCount={unreadCount} onCountRefresh={refreshNotificationCount} />} />
            <Route path="/profile/edit" element={<EditProfile />} />
            <Route path="/profile/:userId" element={<Profile />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;