/**
 * ForgotPassword Component
 * 
 * Handles the password reset request process.
 * Sends a password reset email to the user's email address.
 */

import { auth } from "../../config/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { FaEnvelope, FaArrowLeft, FaPaperPlane, FaCode } from 'react-icons/fa';
import './auth.css';
import { Message, useAutoMessage } from '../../components/common';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const { message, showMessage, clearMessage } = useAutoMessage();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  /**
   * Validate email field
   * @returns {boolean} - True if email is valid, false otherwise
   */
  const validateEmail = () => {
    if (!email.trim()) {
      setEmailError('Email is required');
      return false;
    }
    setEmailError('');
    return true;
  };

  /**
   * Handle form submission for password reset
   * @param {React.FormEvent<HTMLFormElement>} e - Form event
   */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateEmail()) {
      return;
    }

    try {
      setIsLoading(true);
      await sendPasswordResetEmail(auth, email);
      showMessage('success', 'Password reset email sent! Please check your inbox.');
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        showMessage('error', 'No account found with this email address.');
      } else {
        showMessage('error', error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Add handler to clear errors on input
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setEmailError('');
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
          <h2 className="auth-title">Reset Password</h2>
          <p className="auth-subtitle">Enter your email address and we'll send you instructions to reset your password.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="auth-form">
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
          
          <button 
            type="submit" 
            className="auth-button primary-button"
            disabled={isLoading}
          >
            <FaPaperPlane /> Send Reset Link
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
        
        <div className="auth-footer">
          <Link to="/" className="back-to-login">
            <FaArrowLeft /> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword; 