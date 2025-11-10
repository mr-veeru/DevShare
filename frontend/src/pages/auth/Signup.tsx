/**
 * Signup Component
 * 
 * User registration form with username, email, password, and confirmation.
 * Features password visibility toggles and automatic login after successful signup.
 */

import React, { useState } from 'react';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaUser, FaUserCircle } from 'react-icons/fa';
import { useToast } from '../../components/common/Toast/Toast';
import { API_BASE, storeTokens, authenticatedFetch } from '../../utils/auth';
import { ThemeToggle } from '../../components/common/ThemeToggle/ThemeToggle';
import './Auth.css';

const Signup = ({ onSwitchToLogin, onSignupSuccess }: { onSwitchToLogin: () => void, onSignupSuccess: (userData: any) => void }) => {
  const [formData, setFormData] = useState({ 
    username: '', 
    fullname: '',
    email: '', 
    password: '', 
    confirmPassword: '' 
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { showSuccess, showError } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    setLoading(true);
    
    try {
      // Call backend: register
      const registerRes = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          fullname: formData.fullname,
          email: formData.email,
          password: formData.password,
          confirm_password: formData.confirmPassword
        })
      });

      if (!registerRes.ok) {
        const err = await registerRes.json().catch(() => ({}));
        throw new Error(err?.message || 'Signup failed');
      }

      // Auto-login after successful signup
      const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username_or_email: formData.email || formData.username,
          password: formData.password
        })
      });

      if (!loginRes.ok) throw new Error('Auto-login failed');
      const { access_token, refresh_token } = await loginRes.json();
      storeTokens(access_token, refresh_token);

      // Fetch profile
      const profileRes = await authenticatedFetch(`${API_BASE}/api/profile`);
      if (!profileRes.ok) throw new Error('Failed to fetch profile');
      const profile = await profileRes.json();
      const userData = { username: profile.username, email: profile.email };
      localStorage.setItem('userData', JSON.stringify(userData));
      
      showSuccess(`Welcome to DevSharee, ${profile.username}! Account created successfully.`);
      onSignupSuccess(userData);
    } catch (err: any) {
      showError(err?.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <ThemeToggle />
      <div className="auth-card">
        <div className="auth-header">
          <div className="logo">
            <span className="logo-icon">&lt; /&gt;</span>
            <span className="logo-text">DevSharee</span>
          </div>
          <p className="tagline">Connect. Share. Build.</p>
        </div>

        <div className="auth-form">
          <h1>Sign Up</h1>
          <p className="auth-subtitle">Create your account to get started.</p>

          <form onSubmit={handleSubmit}>
            {/* Full Name Input Field */}
            <div className="input-group">
              <div className="input-label">
                <FaUserCircle className="input-icon" />
                <label>Full Name</label>
              </div>
              <input
                type="text"
                placeholder="Your Full Name"
                value={formData.fullname}
                onChange={(e) => setFormData({...formData, fullname: e.target.value})}
                required
              />
            </div>

            {/* Username Input Field */}
            <div className="input-group">
              <div className="input-label">
                <FaUser className="input-icon" />
                <label>Username</label>
              </div>
              <input
                type="text"
                placeholder="yourusername"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                required
              />
            </div>

            {/* Email Input Field */}
            <div className="input-group">
              <div className="input-label">
                <FaEnvelope className="input-icon" />
                <label>Email</label>
              </div>
              <input
                type="email"
                placeholder="youremail@example.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>

            {/* Password Input Field with Visibility Toggle */}
            <div className="input-group">
              <div className="input-label">
                <FaLock className="input-icon" />
                <label>Password</label>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Your password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
              />
              <button 
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            {/* Confirm Password Input Field with Visibility Toggle */}
            <div className="input-group">
              <div className="input-label">
                <FaLock className="input-icon" />
                <label>Confirm Password</label>
              </div>
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                required
              />
              <button 
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            {/* Submit Button */}
            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? 'Creating Account...' : 'Sign Up'} →
            </button>
          </form>

          {/* Switch to Login */}
          <div className="auth-switch">
            <span>Already have an account? </span>
            <button onClick={onSwitchToLogin} className="switch-link">Sign In</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;