/**
 * Login Component
 * 
 * User authentication form supporting username/email login with password.
 * Features password visibility toggle and automatic token management.
 */

import React, { useState } from 'react';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useToast } from '../../components/common/Toast/Toast';
import { API_BASE, storeTokens, authenticatedFetch } from '../../utils/auth';
import { ThemeToggle } from '../../components/common/ThemeToggle/ThemeToggle';
import './Auth.css';

const Login = ({ onSwitchToSignup, onLoginSuccess }: { onSwitchToSignup: () => void, onLoginSuccess: (userData: any) => void }) => {
  const [formData, setFormData] = useState({ usernameOrEmail: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { showSuccess, showError } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    setLoading(true);
    
    try {
      // Real API call: login
      const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username_or_email: formData.usernameOrEmail,
          password: formData.password
        })
      });

      if (!loginRes.ok) {
        const err = await loginRes.json().catch(() => ({}));
        throw new Error(err?.message || 'Login failed');
      }

      const { access_token, refresh_token } = await loginRes.json();
      storeTokens(access_token, refresh_token);

      // Fetch user profile with token
      const profileRes = await authenticatedFetch(`${API_BASE}/api/profile`);
      if (!profileRes.ok) throw new Error('Failed to fetch profile');

      const profile = await profileRes.json();
      const userData = { username: profile.username, email: profile.email };
      localStorage.setItem('userData', JSON.stringify(userData));

      showSuccess(`Welcome back, ${profile.username}!`);
      onLoginSuccess(userData);
    } catch (error: any) {
      showError(error?.message || 'Login failed. Please try again.');
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
          <h1>Sign In</h1>
          <p className="auth-subtitle">Welcome back! Please enter your details to continue.</p>

          <form onSubmit={handleSubmit}>
            {/* Username/Email Input Field */}
            <div className="input-group">
              <div className="input-label">
                <FaEnvelope className="input-icon" />
                <label>Username or Email</label>
              </div>
              <input
                type="text"
                placeholder="username or youremail@example.com"
                value={formData.usernameOrEmail}
                onChange={(e) => setFormData({...formData, usernameOrEmail: e.target.value})}
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

            {/* Submit Button */}
            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? 'Signing In...' : 'Sign In'} →
            </button>
          </form>

          {/* Switch to Signup */}
          <div className="auth-switch">
            <span>Don't have an account? </span>
            <button onClick={onSwitchToSignup} className="switch-link">Sign Up</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;