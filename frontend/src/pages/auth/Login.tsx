/**
 * Login Component
 * 
 * Handles user authentication with email/password and Google OAuth.
 * Features form validation, loading states, and error handling.
 */

import { auth, provider } from "../../config/firebase";
import { signInWithEmailAndPassword, signInWithPopup, signInWithRedirect, getRedirectResult } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { FaGoogle, FaEnvelope, FaLock, FaSignInAlt, FaEye, FaEyeSlash, FaCode } from 'react-icons/fa';
import './auth.css';
import { usePasswordToggle } from './usePasswordToggle';
import { Message, useAutoMessage } from '../../components/common';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const { message, showMessage, clearMessage } = useAutoMessage();
  const [isLoading, setIsLoading] = useState(false);
  const { showPassword, togglePasswordVisibility } = usePasswordToggle();

  const navigate = useNavigate();

  // Check for redirect result on component mount
  useEffect(() => {
    const checkRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          navigate('/feed');
        }
      } catch (error: any) {
        console.error("Redirect sign-in error:", error);
        showMessage('error', getErrorMessage(error));
      }
    };
    
    checkRedirectResult();
  }, [navigate, showMessage]);

  /**
   * Extract meaningful error messages from Firebase errors
   * @param {any} error - Error object from Firebase
   * @returns {string} - User-friendly error message
   */
  const getErrorMessage = (error: any): string => {
    if (error.code === 'auth/popup-closed-by-user') {
      return 'Sign-in popup was closed before completion';
    } else if (error.code === 'auth/cancelled-popup-request') {
      return 'The sign-in popup was cancelled';
    } else if (error.code === 'auth/popup-blocked') {
      return 'The sign-in popup was blocked by your browser';
    } else if (error.code) {
      return `Authentication error (${error.code})`;
    }
    return error.message || 'An unexpected error occurred';
  };

  /**
   * Validate login form fields
   * @returns {boolean} - True if form is valid, false otherwise
   */
  const validateLoginForm = () => {
    let isValid = true;

    if (!email.trim()) {
      setEmailError('Email is required');
      isValid = false;
    } else {
      setEmailError('');
    }

    if (!password.trim()) {
      setPasswordError('Password is required');
      isValid = false;
    } else {
      setPasswordError('');
    }

    return isValid;
  };

  /**
   * Handle form submission for user login
   * @param {React.FormEvent<HTMLFormElement>} e - Form event
   */
  const login = async (e: React.FormEvent<HTMLFormElement>) => { 
    e.preventDefault();

    if (!validateLoginForm()) {
      return;
    }

    try {
      setIsLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/feed');
    } catch (error: any) {
      if (error.code === "auth/invalid-credential") {
        showMessage('error', "Invalid email or password");
      } else {
        showMessage('error', error.message);
      }
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Handle Google sign-in
   */
  const signInWithGoogle = async () => {
    try {
      setIsLoading(true);
      
      // Try popup first
      try {
        const result = await signInWithPopup(auth, provider);
        if (result.user) {
          // Check if this is the first time the user has signed in with Google
          // @ts-ignore - _tokenResponse exists but isn't in the TypeScript definition
          const isNewUser = result._tokenResponse?.isNewUser;
          
          // If user exists but signed in with Google for the first time,
          // it means they previously had an email/password account
          if (!isNewUser) {
            // Check if this account was linked (look for Google provider data)
            const isGoogleAccount = result.user.providerData.some(
              provider => provider.providerId === 'google.com'
            );
            
            // Only show the message and redirect to settings if this is truly a linked account
            if (isGoogleAccount && result.user.providerData.length > 1) {
              // If the display name matches a Google profile name (typically full name),
              // we should alert the user what happened
              showMessage('error', 
                "Your email/password account has been linked with your Google account. " +
                "Your posts are preserved but your username may have changed. " +
                "You can update your username in Profile Settings."
              );
              
              // Wait 5 seconds before navigating so user can see the message
              setTimeout(() => {
                navigate('/feed');
              }, 5000);
              return;
            } else {
              // Just navigate to feed for normal logins
              navigate('/feed');
              return;
            }
          }
          
          navigate('/feed');
        }
      } catch (popupError: any) {
        // If popup is blocked or fails, fallback to redirect
        if (
          popupError.code === 'auth/popup-closed-by-user' || 
          popupError.code === 'auth/cancelled-popup-request'
        ) {
          // Popup failed, fallback to redirect method
          await signInWithRedirect(auth, provider);
          // Page will reload and redirect result will be handled in useEffect
        } else {
          throw popupError;
        }
      }
    } catch (error) {
      showMessage('error', getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  // Add handlers to clear errors on input
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setEmailError('');
    clearMessage();
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    setPasswordError('');
    clearMessage();
  };

  return (
    <div className="auth-container">
      <div className="auth-background"></div>
      <div className="auth-card">
        <div className="auth-card-header">
          <div className="auth-logo">
            <h1><FaCode /> DevShare</h1>
            <p className="auth-tagline">Connect. Share. Build.</p>
          </div>
          <h2 className="auth-title">Sign In</h2>
          <p className="auth-subtitle">Welcome back! Please enter your details to continue.</p>
        </div>
        
        <form onSubmit={login} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">
              <FaEnvelope className="input-icon" /> Email
            </label>
            <input 
              id="email"
              type="email" 
              placeholder="youremail@example.com" 
              value={email} 
              onChange={handleEmailChange}
              className={emailError ? "input-error" : ""}
            />
            {emailError && <p className="error-message">{emailError}</p>}
          </div>
          
          <div className="form-group">
            <label htmlFor="password">
              <FaLock className="input-icon" /> Password
            </label>
            <div className="password-input-container">
              <input 
                id="password"
                type={showPassword ? "text" : "password"} 
                placeholder="Your password" 
                value={password} 
                onChange={handlePasswordChange}
                className={passwordError ? "input-error" : ""}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={togglePasswordVisibility}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {passwordError && <p className="error-message">{passwordError}</p>}
            <Link to="/forgot-password" className="forgot-password-link">
              Forgot Password?
            </Link>
          </div>
          
          <button 
            type="submit" 
            className="auth-button primary-button"
            disabled={isLoading}
          >
            <FaSignInAlt /> Sign In
            {isLoading && <span className="button-loader"></span>}
          </button>
          
          {message.text && (
            <Message 
              type={message.type as 'success' | 'error'} 
              message={message.text} 
              onClose={clearMessage}
            />
          )}
        </form>
        
        <div className="divider">
          <span>OR</span>
        </div>
        
        <div className="social-buttons">
          <button 
            onClick={signInWithGoogle}
            className="social-button google-button"
            disabled={isLoading}
          >
            <FaGoogle /> Continue with Google
          </button>
        </div>
        
        <div className="auth-footer">
          Don't have an account? <Link to="/register">Sign Up</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
