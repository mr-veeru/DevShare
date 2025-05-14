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
  FaArrowLeft, 
  FaUser, 
  FaLock, 
  FaUserTimes 
} from 'react-icons/fa';
import { usePasswordToggle } from '../auth/usePasswordToggle';
import { Message } from '../../components/common';
import './ProfileSettings.css';

// Interface for password form data
interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Types of status messages
type MessageType = 'success' | 'error' | null;

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
  
  // Password visibility using custom hook
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
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<MessageType>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);

  // Display message helper functions
  const showSuccessMessage = (msg: string) => {
    setMessage(msg);
    setMessageType('success');
  };
  
  const showErrorMessage = (msg: string) => {
    setMessage(msg);
    setMessageType('error');
  };

  // Auto-dismiss messages after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
        setMessageType(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Clear password fields on mount
  useEffect(() => {
    resetPasswordForm();
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
          showErrorMessage("Username already exists. Please choose a different one.");
          return;
        }
      }
      
      // Update profile
      await updateProfile(user, { displayName });
      
      // Update all user content with new username
      await updateUsernameInUserContent(user.uid, displayName);
      
      showSuccessMessage("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      showErrorMessage("Failed to update profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Updates username across all user content (posts, comments, replies)
   */
  const updateUsernameInUserContent = async (userId: string, newUsername: string) => {
    const batch = writeBatch(db);
    const collections = ['posts', 'comments'];
    
    for (const collectionName of collections) {
      const userContentQuery = query(
        collection(db, collectionName), 
        where("userId", "==", userId)
      );
      const userContent = await getDocs(userContentQuery);
      
      userContent.docs.forEach((document) => {
        batch.update(document.ref, { username: newUsername });
      });
    }
    
    await batch.commit();
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
      await reauthenticateUser(passwordData.currentPassword);
      
      // Update password
      await updatePassword(user, passwordData.newPassword);
      
      // Reset form and show success
      resetPasswordForm();
      showSuccessMessage("Your password has been successfully updated!");
      
    } catch (error: any) {
      handleAuthError(error, "changing password");
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
      
      // Validate password for deactivation
      if (!deactivatePassword && !isGoogleUser()) {
        showErrorMessage("Please enter your password to deactivate your account.");
        return;
      }
      
      // Reauthenticate if email/password user
      if (!isGoogleUser()) {
        await reauthenticateUser(deactivatePassword);
      }
      
      // Delete all user data
      await deleteUserData(user.uid);
      
      // Delete the user account
      await deleteUser(user);
      
      // Navigate to home page
      navigate('/');
    } catch (error: any) {
      handleAuthError(error, "deactivating account");
    } finally {
      setIsSubmitting(false);
      setShowDeactivateDialog(false);
    }
  };

  /**
   * Reauthenticate user with current password
   */
  const reauthenticateUser = async (password: string) => {
    if (!user || !user.email) throw new Error("User not logged in or missing email");
    
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
  };

  /**
   * Delete all user data from Firestore
   */
  const deleteUserData = async (userId: string) => {
    const batch = writeBatch(db);
    const collections = ['posts', 'comments', 'likes', 'notifications'];
    
    for (const collectionName of collections) {
      const userDocsQuery = query(
        collection(db, collectionName), 
        where("userId", "==", userId)
      );
      const userDocs = await getDocs(userDocsQuery);
      
      userDocs.docs.forEach((document) => {
        batch.delete(document.ref);
      });
    }
    
    await batch.commit();
  };

  /**
   * Validate password fields
   */
  const validatePasswordFields = (): boolean => {
    const { currentPassword, newPassword, confirmPassword } = passwordData;
    
    if (!currentPassword) {
      showErrorMessage("Please enter your current password.");
      return false;
    }
    
    if (newPassword.length < 8) {
      showErrorMessage("New password must be at least 8 characters.");
      return false;
    }
    
    if (!/[A-Z]/.test(newPassword)) {
      showErrorMessage("New password must contain at least one uppercase letter.");
      return false;
    }
    
    if (!/[0-9]/.test(newPassword)) {
      showErrorMessage("New password must contain at least one number.");
      return false;
    }
    
    if (newPassword !== confirmPassword) {
      showErrorMessage("New passwords do not match.");
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
    setDeactivatePassword('');
  };

  /**
   * Handle authentication errors
   */
  const handleAuthError = (error: any, action: string) => {
    console.error(`Error ${action}:`, error);
    
    if (error.code === 'auth/wrong-password' || error.code === 'auth/user-mismatch') {
      showErrorMessage("Incorrect password. Please try again.");
    } else if (error.code === 'auth/too-many-requests') {
      showErrorMessage("Too many attempts. Please try again later.");
    } else if (error.code === 'auth/requires-recent-login') {
      showErrorMessage("For security reasons, please log out and log back in before trying again.");
    } else {
      showErrorMessage(`Failed to ${action}. Please try again.`);
    }
  };

  /**
   * Check if user is signed in with Google
   */
  const isGoogleUser = () => {
    if (!user) return false;
    
    const providerData = user.providerData;
    return providerData.some(provider => provider.providerId === 'google.com');
  };

  // Redirect if not logged in
  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="settings-page">
      <div className="settings-container">
        <header className="settings-header">
          <button className="back-button" onClick={() => navigate(-1)}>
            <FaArrowLeft /> Back
          </button>
          <h1>Profile Settings</h1>
        </header>
        
        {message && (
          <div className="messages-container">
            <Message 
              type={messageType as 'success' | 'error'} 
              message={message} 
              onClose={() => { setMessage(null); setMessageType(null); }} 
            />
          </div>
        )}
        
        <section className="settings-section">
          <h2><FaUser /> Profile Information</h2>
          <div className="form-group">
            <label>Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your display name"
            />
            <p className="field-help">
              This name will be displayed on all your posts and comments.
            </p>
          </div>
          
          <button 
            className="save-button"
            onClick={handleSaveProfile}
            disabled={isSubmitting || !displayName.trim()}
          >
            Save Changes
          </button>
        </section>
        
        {!isGoogleUser() && (
          <section className="settings-section">
            <h2><FaLock /> Change Password</h2>
            <div className="form-group">
              <label>Current Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                  placeholder="Enter current password"
                />
                <button 
                  type="button"
                  className="toggle-password"
                  onClick={toggleCurrentPassword}
                >
                  {showCurrentPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>
            
            <div className="form-group">
              <label>New Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                  placeholder="Enter new password"
                />
                <button 
                  type="button"
                  className="toggle-password"
                  onClick={toggleNewPassword}
                >
                  {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              <p className="field-help">
                Password must be at least 8 characters with at least one uppercase letter and one number.
              </p>
            </div>
            
            <div className="form-group">
              <label>Confirm New Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                  placeholder="Confirm new password"
                />
                <button 
                  type="button"
                  className="toggle-password"
                  onClick={toggleConfirmPassword}
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
        )}
        
        <section className="settings-section danger-zone">
          <h2><FaUserTimes /> Deactivate Account</h2>
          <p className="warning-text">
            Warning: This action is permanent. All your data will be deleted and cannot be recovered.
          </p>
          
          <button 
            className="deactivate-button"
            onClick={() => setShowDeactivateDialog(true)}
          >
            Deactivate Account
          </button>
        </section>
        
        {showDeactivateDialog && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>Confirm Account Deactivation</h2>
              <p>Are you sure you want to permanently delete your account? This action cannot be undone.</p>
              
              {!isGoogleUser() && (
                <div className="form-group">
                  <label>Enter your password to confirm</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showDeactivatePasswordVisibility ? "text" : "password"}
                      value={deactivatePassword}
                      onChange={(e) => setDeactivatePassword(e.target.value)}
                      placeholder="Enter your password"
                    />
                    <button 
                      type="button"
                      className="toggle-password"
                      onClick={toggleDeactivatePassword}
                    >
                      {showDeactivatePasswordVisibility ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>
              )}
              
              <div className="modal-actions">
                <button 
                  className="cancel-button"
                  onClick={() => setShowDeactivateDialog(false)}
                >
                  Cancel
                </button>
                <button 
                  className="confirm-button"
                  onClick={handleDeactivateAccount}
                  disabled={isSubmitting || (!isGoogleUser() && !deactivatePassword)}
                >
                  Deactivate
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
