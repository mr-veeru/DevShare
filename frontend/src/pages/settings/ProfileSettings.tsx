/**
 * @fileoverview Profile Settings Component
 * Handles user profile management including:
 * - Display name updates
 * - Password changes
 * - Account deactivation
 * Features form validation and comprehensive error handling.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../../config/firebase';
import { 
  updateProfile, 
  EmailAuthProvider, 
  reauthenticateWithCredential, 
  updatePassword, 
  deleteUser 
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  writeBatch 
} from 'firebase/firestore';
import { 
  FaEye, 
  FaEyeSlash, 
  FaCheckCircle, 
  FaExclamationCircle, 
  FaTimes, 
  FaArrowLeft, 
  FaUser, 
  FaLock, 
  FaUserTimes 
} from 'react-icons/fa';
import { usePasswordToggle } from '../auth/usePasswordToggle';
import './ProfileSettings.css';

// Interface for password form data
interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * ProfileSettings Component
 * Main settings page for user profile management
 */
const ProfileSettings = () => {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  
  // Form states
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [deactivatePassword, setDeactivatePassword] = useState('');
  
  // Password visibility states using custom hook
  const {
    showPassword: showCurrentPassword,
    showConfirmPassword: showNewPassword,
    togglePasswordVisibility: toggleCurrentPassword,
    toggleConfirmPasswordVisibility: toggleNewPassword
  } = usePasswordToggle();
  
  const {
    showPassword: showConfirmPassword,
    showConfirmPassword: showDeactivatePasswordVisibility,
    togglePasswordVisibility: toggleConfirmPassword,
    toggleConfirmPasswordVisibility: toggleDeactivatePassword
  } = usePasswordToggle();
  
  // UI states
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);

  // Auto-dismiss messages after 5 seconds
  useEffect(() => {
    if (error || successMessage) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, successMessage]);

  // Clear password fields on mount
  useEffect(() => {
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  }, []);

  /**
   * Handle profile display name update
   */
  const handleSaveProfile = async () => {
    if (!user) return;
    
    try {
      setIsSubmitting(true);
      
      // Check if username is already taken by someone else
      if (displayName !== user.displayName) {
        // Query posts by this username
        const postsRef = collection(db, "posts");
        const q = query(postsRef, where("username", "==", displayName));
        const querySnapshot = await getDocs(q);
        
        // Check if any posts with this username belong to a different user
        const isTakenByAnotherUser = querySnapshot.docs.some(
          doc => doc.data().userId !== user.uid
        );
        
        if (isTakenByAnotherUser) {
          setError("Username already exists. Please choose a different one.");
          return;
        }
      }
      
      // Update profile
      await updateProfile(user, { displayName });
      
      // Update all user's posts with new username
      const userPostsQuery = query(collection(db, "posts"), where("userId", "==", user.uid));
      const userPosts = await getDocs(userPostsQuery);
      
      const batch = writeBatch(db);
      userPosts.docs.forEach((doc) => {
        batch.update(doc.ref, { username: displayName });
      });
      
      // Update all user's comments with new username
      const userCommentsQuery = query(collection(db, "comments"), where("userId", "==", user.uid));
      const userComments = await getDocs(userCommentsQuery);
      
      userComments.docs.forEach((doc) => {
        batch.update(doc.ref, { username: displayName });
      });
      
      // Update all user's replies with new username
      const userRepliesQuery = query(collection(db, "replies"), where("userId", "==", user.uid));
      const userReplies = await getDocs(userRepliesQuery);
      
      userReplies.docs.forEach((doc) => {
        batch.update(doc.ref, { username: displayName });
      });
      
      await batch.commit();
      
      setSuccessMessage("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      setError("Failed to update profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle password change
   */
  const handlePasswordChange = async () => {
    if (!user) return;
    
    try {
      setIsSubmitting(true);
      
      // Validate password fields
      if (!validatePasswordFields()) return;

      // Reauthenticate user
      const credential = EmailAuthProvider.credential(
        user.email!,
        passwordData.currentPassword
      );
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, passwordData.newPassword);
      
      // Reset form and show success
      resetPasswordForm();
      setSuccessMessage("Your password has been successfully updated!");
      
    } catch (error: any) {
      handlePasswordError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle account deactivation
   */
  const handleDeactivateAccount = async () => {
    if (!user) return;
    
    try {
      setIsSubmitting(true);
      
      // Check if user is Google-authenticated
      if (isGoogleUser()) {
        // For Google users, skip password verification
        // Delete user data and account directly
        await deleteUserData(user.uid);
        await deleteUser(user);
        navigate('/');
      } else {
        // For email/password users, continue with password verification
        if (!deactivatePassword.trim()) {
          setError("Please enter your password to deactivate account");
          return;
        }

        // Re-authenticate user
        const credential = EmailAuthProvider.credential(
          user.email!,
          deactivatePassword
        );
        await reauthenticateWithCredential(user, credential);

        // Delete user data
        await deleteUserData(user.uid);

        // Delete user account
        await deleteUser(user);
        navigate('/');
      }
      
    } catch (error: any) {
      handleDeactivationError(error);
    } finally {
      setIsSubmitting(false);
      setShowDeactivateDialog(false);
      setDeactivatePassword('');
    }
  };

  /**
   * Delete all user data from Firestore
   */
  const deleteUserData = async (userId: string) => {
    const batch = writeBatch(db);
    const collections = ['posts', 'comments', 'likes'];
    
    for (const collectionName of collections) {
      const userDataQuery = query(
        collection(db, collectionName), 
        where("userId", "==", userId)
      );
      const userDocs = await getDocs(userDataQuery);
      userDocs.docs.forEach((doc) => batch.delete(doc.ref));
    }

    await batch.commit();
  };

  /**
   * Validate password change fields
   */
  const validatePasswordFields = (): boolean => {
    if (!passwordData.currentPassword.trim()) {
      setError("Please enter your current password");
      return false;
    }
    
    if (!passwordData.newPassword.trim()) {
      setError("Please enter a new password");
      return false;
    }
    
    if (!passwordData.confirmPassword.trim()) {
      setError("Please confirm your new password");
      return false;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("New passwords don't match. Please try again.");
      return false;
    }

    if (passwordData.newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return false;
    }

    return true;
  };

  /**
   * Reset password form fields
   */
  const resetPasswordForm = () => {
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  };

  /**
   * Handle password change errors
   */
  const handlePasswordError = (error: any) => {
    let message = "Unable to update password. Please try again.";
    
    switch (error.code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
        message = "Current password is incorrect. Please try again.";
        break;
      case 'auth/weak-password':
        message = "New password is too weak. Please choose a stronger password.";
        break;
      case 'auth/requires-recent-login':
        message = "For security reasons, please log out and log back in before changing your password.";
        break;
    }

    setError(message);
  };

  /**
   * Handle deactivation errors
   */
  const handleDeactivationError = (error: any) => {
    let message = "Unable to deactivate account. Please try again.";
    
    switch (error.code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
        message = "Incorrect password. Please try again.";
        break;
      case 'auth/requires-recent-login':
        message = "For security reasons, please log out and log back in before deactivating your account.";
        break;
    }

    setError(message);
  };

  const isGoogleUser = () => {
    const user = auth.currentUser;
    return user?.providerData.some(provider => provider.providerId === 'google.com') || false;
  };

  return (
    <div className="settings-page">
      {(error || successMessage) && (
        <div className="messages-container">
          <div className={`message ${error ? 'message-error' : 'message-success'}`}>
            {error ? (
              <FaExclamationCircle className="message-icon" />
            ) : (
              <FaCheckCircle className="message-icon" />
            )}
            <span className="message-content">{error || successMessage}</span>
            <button 
              className="message-close"
              onClick={() => error ? setError(null) : setSuccessMessage(null)}
              aria-label="Close message"
            >
              <FaTimes />
            </button>
          </div>
        </div>
      )}

      <div className="settings-container">
        <header className="settings-header">
          <h1>Profile Settings</h1>
          <button className="back-button" onClick={() => navigate('/profile')}>
            <FaArrowLeft /> Back to Profile
          </button>
        </header>

        {/* Profile Settings Section */}
        <section className="settings-section">
          <h2><FaUser /> Edit Profile</h2>
          <div className="form-group">
            <label htmlFor="displayName">Display Name</label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="settings-input"
            />
          </div>
          <button 
            className="save-button"
            onClick={handleSaveProfile}
            disabled={isSubmitting}
          >
            Save Changes
          </button>
        </section>

        {/* Password Section */}
        {!isGoogleUser() ? (
          <section className="settings-section">
            <h2><FaLock /> Change Password</h2>
            <div className="form-group">
              <label htmlFor="currentPassword">Current Password</label>
              <div className="password-input-container">
                <input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({
                    ...passwordData,
                    currentPassword: e.target.value
                  })}
                  className="settings-input"
                  autoComplete="off"
                  spellCheck={false}
                  data-form-type="other"
                />
                <button
                  type="button"
                  className="toggle-password-btn"
                  onClick={toggleCurrentPassword}
                  aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                >
                  {showCurrentPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <div className="password-input-container">
                <input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({
                    ...passwordData,
                    newPassword: e.target.value
                  })}
                  className="settings-input"
                  autoComplete="new-password"
                  spellCheck={false}
                  data-form-type="other"
                />
                <button
                  type="button"
                  className="toggle-password-btn"
                  onClick={toggleNewPassword}
                  aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                >
                  {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <div className="password-input-container">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({
                    ...passwordData,
                    confirmPassword: e.target.value
                  })}
                  className="settings-input"
                  autoComplete="new-password"
                  spellCheck={false}
                  data-form-type="other"
                />
                <button
                  type="button"
                  className="toggle-password-btn"
                  onClick={toggleConfirmPassword}
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>
            
            <button 
              className="save-button"
              onClick={handlePasswordChange}
              disabled={isSubmitting}
            >
              Update Password
            </button>
          </section>
        ) : (
          <section className="settings-section">
            <h2><FaLock /> Password Management</h2>
            <p className="info-message">
              You signed in with Google. Your password is managed through your Google account.
            </p>
            <a 
              href="https://myaccount.google.com/security" 
              target="_blank" 
              rel="noopener noreferrer"
              className="google-account-link"
            >
              Manage Google Account Settings
            </a>
          </section>
        )}

        {/* Danger Zone */}
        <section className="settings-section danger-zone">
          <h2><FaUserTimes /> Danger Zone</h2>
          <div className="danger-zone-content">
            <p className="warning-text">
              Once you deactivate your account, all your data will be permanently deleted. 
              This action cannot be undone.
            </p>
            <button 
              className="deactivate-button"
              onClick={() => setShowDeactivateDialog(true)}
            >
              Deactivate Account
            </button>
          </div>
        </section>

        {/* Deactivation Dialog */}
        {showDeactivateDialog && (
          <div className="dialog-overlay">
            <div className="dialog-content" data-autocomplete="off">
              <h3>Deactivate Account</h3>
              <p>
                Are you sure you want to deactivate your account? This will:
                <ul>
                  <li>Delete all your posts and comments</li>
                  <li>Remove all your likes and interactions</li>
                  <li>Permanently delete your account</li>
                </ul>
              </p>
              
              {!isGoogleUser() ? (
                <div className="form-group">
                  <label htmlFor="deactivatePassword">Enter your password to confirm:</label>
                  <div className="password-input-container">
                    <input
                      id="deactivatePassword"
                      type={showDeactivatePasswordVisibility ? "text" : "password"}
                      value={deactivatePassword}
                      onChange={(e) => setDeactivatePassword(e.target.value)}
                      className="settings-input"
                      autoComplete="new-password"
                      spellCheck={false}
                      data-form-type="other"
                    />
                    <button
                      type="button"
                      className="toggle-password-btn"
                      onClick={toggleDeactivatePassword}
                      aria-label={showDeactivatePasswordVisibility ? "Hide password" : "Show password"}
                    >
                      {showDeactivatePasswordVisibility ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="info-message">
                  You're signed in with Google. Deactivating your account will remove all your data from DevShare, but won't affect your Google account.
                </p>
              )}
              
              <div className="dialog-actions">
                <button 
                  className="cancel-button"
                  onClick={() => {
                    setShowDeactivateDialog(false);
                    setDeactivatePassword('');
                  }}
                >
                  Cancel
                </button>
                <button 
                  className="deactivate-confirm-button"
                  onClick={handleDeactivateAccount}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Deactivating...' : 'Deactivate Account'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileSettings; 
