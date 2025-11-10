/**
 * Edit Profile Page
 * 
 * Allows users to edit their profile information and change password.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSave, FaTimes, FaEye, FaEyeSlash, FaTrash } from 'react-icons/fa';
import { authenticatedFetch, API_BASE, clearAuthData } from '../../utils/auth';
import { useToast } from '../../components/common/Toast/Toast';
import { useAuth } from '../../hooks/useAuth';
import ConfirmModal from '../../components/common/ConfirmModal/ConfirmModal';
import { User } from '../../types';
import './EditProfile.css';

const EditProfile: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editFullname, setEditFullname] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editBio, setEditBio] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  
  // Password visibility toggles
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const { showError, showSuccess } = useToast();
  const { handleLogout } = useAuth();
  const navigate = useNavigate();
  
  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const response = await authenticatedFetch(`${API_BASE}/api/profile`);
        
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setEditFullname(userData.fullname || '');
          setEditUsername(userData.username || '');
          setEditEmail(userData.email || '');
          setEditBio(userData.bio || '');
        } else {
          const result = await response.json().catch(() => ({}));
          showError(result.message || 'Failed to load profile data');
          navigate('/profile');
        }
      } catch (error) {
        showError('Error loading profile');
        navigate('/profile');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const resetPasswordFields = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  // Helper function to handle API responses
  const handleApiResponse = async (response: Response, defaultError: string) => {
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || defaultError);
    }
    return await response.json().catch(() => ({}));
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSavingProfile(true);
    try {
      const updatedProfile = await handleApiResponse(
        await authenticatedFetch(`${API_BASE}/api/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullname: editFullname.trim(),
            username: editUsername.trim(),
            email: editEmail.trim(),
            bio: editBio.trim()
          })
        }),
        'Failed to update profile'
      );

      setUser(updatedProfile);
      const userData = { username: updatedProfile.username, email: updatedProfile.email };
      localStorage.setItem('userData', JSON.stringify(userData));
      
      showSuccess('Profile updated successfully');
      navigate('/profile');
    } catch (error: any) {
      showError(error.message || 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUpdatePassword = async () => {
    setIsUpdatingPassword(true);
    try {
      const result = await handleApiResponse(
        await authenticatedFetch(`${API_BASE}/api/profile/change-password`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword,
            confirm_password: confirmPassword
          })
        }),
        'Failed to change password'
      );

      showSuccess(result.message || 'Password updated successfully');
      resetPasswordFields();
    } catch (error: any) {
      showError(error.message || 'Failed to update password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleCancel = () => {
    navigate('/profile');
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      showError('Please enter your password to confirm account deletion');
      return;
    }

    setIsDeletingAccount(true);
    try {
      const response = await authenticatedFetch(`${API_BASE}/api/profile/delete-account`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword })
      });

      const result = await response.json().catch(() => ({}));

      if (response.ok) {
        showSuccess('Your account has been deleted successfully');
        // Clear auth data immediately (account is already deleted)
        clearAuthData();
        // Try to logout (may fail since account is deleted, but that's okay)
        // This will also update auth state and redirect
        await handleLogout();
      } else {
        showError(result.message || 'Failed to delete account');
      }
    } catch (error: any) {
      showError(error.message || 'Error deleting account');
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteModal(false);
      setDeletePassword('');
    }
  };

  if (loading) {
    return (
      <div className="edit-profile-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="edit-profile-container">
        <div className="error-state">
          <h2>Profile Not Found</h2>
          <p>Unable to load profile data. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="edit-profile-container">
      <div className="edit-profile-header">
        <h1>Edit Profile</h1>
        <p>Update your profile information and password</p>
      </div>

      <div className="edit-profile-form">
        <div className="form-section">
          <h2 className="section-title">Profile Information</h2>
          
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              className="profile-edit-input"
              value={editFullname}
              onChange={(e) => setEditFullname(e.target.value)}
              placeholder="Your Full Name"
            />
          </div>

          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              className="profile-edit-input"
              value={editUsername}
              onChange={(e) => setEditUsername(e.target.value)}
              placeholder="yourusername"
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              className="profile-edit-input"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              placeholder="youremail@example.com"
            />
          </div>

          <div className="form-group">
            <label>Bio</label>
            <textarea
              className="profile-edit-input"
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              placeholder="Tell us about yourself..."
              rows={4}
              maxLength={500}
            />
            <span className="char-count">{editBio.length}/500</span>
          </div>

          <div className="profile-edit-actions">
            <button
              className="cancel-btn-inline"
              onClick={handleCancel}
              disabled={isSavingProfile}
            >
              <FaTimes className="menu-icon" />
              Cancel
            </button>
            <button
              className="save-btn-inline"
              onClick={handleSaveProfile}
              disabled={isSavingProfile}
            >
              <FaSave className="menu-icon" />
              {isSavingProfile ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        <div className="form-section password-change-section">
          <h2 className="section-title">Change Password</h2>
          <p className="password-section-subtitle">Update your password below</p>
          
          <div className="form-group">
            <label>Current Password</label>
            <div className="password-input-wrapper">
              <input
                type={showCurrentPassword ? "text" : "password"}
                className="profile-edit-input"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                aria-label={showCurrentPassword ? "Hide password" : "Show password"}
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
                className="profile-edit-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowNewPassword(!showNewPassword)}
                aria-label={showNewPassword ? "Hide password" : "Show password"}
              >
                {showNewPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <span className="password-hint">At least 8 characters with uppercase, digit, and special character (@#$%&*!?)</span>
          </div>
          
          <div className="form-group">
            <label>Confirm New Password</label>
            <div className="password-input-wrapper">
              <input
                type={showConfirmPassword ? "text" : "password"}
                className="profile-edit-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>
          
          <div className="password-update-actions">
            <button
              className="save-btn-inline"
              onClick={handleUpdatePassword}
              disabled={isUpdatingPassword}
            >
              <FaSave className="menu-icon" />
              {isUpdatingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </div>

        <div className="form-section danger-section">
          <h2 className="section-title danger-title">Danger Zone</h2>
          <p className="danger-description">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          
          <button
            className="delete-account-btn"
            onClick={() => setShowDeleteModal(true)}
          >
            <FaTrash className="menu-icon" />
            Delete Account
          </button>
        </div>

        {/* Delete Account Confirmation Modal */}
        <ConfirmModal
          open={showDeleteModal}
          title="Delete Account"
          description="This action cannot be undone. This will permanently delete your account, posts, comments, and all associated data."
          confirmLabel="Delete My Account"
          cancelLabel="Cancel"
          loading={isDeletingAccount}
          confirmDisabled={!deletePassword}
          onClose={() => {
            setShowDeleteModal(false);
            setDeletePassword('');
          }}
          onConfirm={handleDeleteAccount}
        >
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontSize: '14px', fontWeight: 500 }}>
              Enter your password to confirm
            </label>
            <div className="password-input-wrapper">
              <input
                type={showDeletePassword ? "text" : "password"}
                className="profile-edit-input"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={isDeletingAccount}
                style={{ width: '100%', paddingRight: '45px' }}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowDeletePassword(!showDeletePassword)}
                aria-label={showDeletePassword ? "Hide password" : "Show password"}
                disabled={isDeletingAccount}
              >
                {showDeletePassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>
        </ConfirmModal>
      </div>
    </div>
  );
};

export default EditProfile;

