/**
 * @fileoverview Main Application Component
 * This file contains the core application structure, routing configuration,
 * and authentication flow management.
 */

import { BrowserRouter as Router, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './config/firebase';
import Login from './pages/auth/Login';
import Feed from './pages/feed/Feed';
import Navbar from './components/navbar/Navbar';
import CreatePost from './pages/createPost/CreatePost';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import Profile from './pages/profile/Profile';
import './styles/styles.css';
import { LoadingSpinner, ErrorBoundary } from './components/common';
import ProfileSettings from './pages/settings/ProfileSettings';
import NotificationsPage from './pages/notifications/NotificationsPage';
import SinglePost from './pages/notifications/SinglePost';
import KeyboardShortcutsGuide from './pages/settings/KeyboardShortcutsGuide';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ThemeProvider } from './context/ThemeContext';

/**
 * ProtectedRoute Component
 * Higher-order component that ensures routes are only accessible to authenticated users.
 * Redirects to home page if user is not authenticated.
 */
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [user, loading] = useAuthState(auth);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return user ? <>{children}</> : null;
};

/**
 * AppContent Component
 * Handles the main application logic, routing, and authentication state.
 * Uses hooks for managing user state and navigation.
 */
function AppContent() {
  const [loading, setLoading] = useState(true);
  const [user] = useAuthState(auth);
  const location = useLocation();

  // Set up authentication state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Determine navbar visibility based on auth state and route
  const showNavbar = user ? true : !['/login', '/', '/register'].includes(location.pathname);

  if (loading) {
    return <LoadingSpinner text="Starting DevShare..." />;
  }

  return (
    <div className="App">
      {showNavbar && <Navbar />}
      <div className="page-transition-container">
        <Routes>
          {/* Public Routes */}
          <Route path='/' element={<Login />} />
          <Route path='/register' element={<Register />} />
          <Route path='/forgot-password' element={<ForgotPassword />} />

          {/* Protected Routes */}
          <Route path='/feed' element={
            <ProtectedRoute>
              <Feed />
            </ProtectedRoute>
          } />
          <Route path='/createPost' element={
            <ProtectedRoute>
              <CreatePost />
            </ProtectedRoute>
          } />
          <Route path='/profile' element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          {/* Redirect /myPost to /profile since they show the same component */}
          <Route path='/myPost' element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          <Route path="/user/:username" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          <Route path="/settings/profile" element={
            <ProtectedRoute>
              <ProfileSettings />
            </ProtectedRoute>
          } />
          <Route path="/settings/keyboard-shortcuts" element={
            <ProtectedRoute>
              <KeyboardShortcutsGuide />
            </ProtectedRoute>
          } />
          <Route path="/notifications" element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          } />
          <Route path="/post/:postId" element={
            <ProtectedRoute>
              <SinglePost />
            </ProtectedRoute>
          } />
        </Routes>
      </div>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </div>
  );
}

/**
 * App Component
 * Root component that provides routing and error boundary wrapper.
 */
function App() {
  return (
    <ThemeProvider>
    <Router>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </Router>
    </ThemeProvider>
  );
}

export default App;
