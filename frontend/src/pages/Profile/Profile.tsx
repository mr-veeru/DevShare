/**
 * Profile Page
 * 
 * User profile displaying user information, statistics, and their posts.
 * Allows post editing and deletion with inline modal forms.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaCalendarAlt, FaCode, FaPlus } from 'react-icons/fa';
import LetterAvatar from '../../components/common/LetterAvatar/LetterAvatar';
import PostCard from '../../components/common/PostCard/PostCard';
import { authenticatedFetch, API_BASE, getCurrentUserId } from '../../utils/auth';
import { useToast } from '../../components/common/Toast/Toast';
import { User, Post } from '../../types';
import { formatDisplayDate } from '../../utils/date';
import './Profile.css';

const Profile: React.FC = () => {
  const { userId } = useParams<{ userId?: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const { showError, showSuccess } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const url = userId ? `${API_BASE}/api/profile/users/${userId}` : `${API_BASE}/api/profile`;
        const response = await authenticatedFetch(url);
        if (!isMounted) return;
        if (response.ok) {
          const userData = await response.json();
          if (!isMounted) return;
          setUser(userData);
          // If viewing own profile (!userId), use profile id as currentUserId
          // If viewing other user's profile, get currentUserId separately
          if (!userId) {
          setCurrentUserId(userData.id);
            setIsOwnProfile(true);
          } else {
            // Only fetch currentUserId when viewing another user's profile
            const currentId = await getCurrentUserId();
            if (!isMounted) return;
            setCurrentUserId(currentId);
            setIsOwnProfile(!!currentId && userData.id === currentId);
          }
        } else {
          const result = await response.json();
          if (isMounted) showError(result.message || 'Failed to load profile data');
        }
      } catch (error: any) {
        if (isMounted) showError('Error loading profile');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchUserProfile();
    // Cleanup: prevent state updates if component unmounts or userId changes
    return () => { isMounted = false; };
  }, [userId]); // Only re-fetch when userId changes

  useEffect(() => {
    if (!user?.id) return;
    const fetchUserPosts = async () => {
      try {
        setPostsLoading(true);
        const url = userId ? `${API_BASE}/api/profile/users/${userId}/posts` : `${API_BASE}/api/profile/posts`;
        const response = await authenticatedFetch(url);
        if (response.ok) {
          const data = await response.json();
          setPosts(data.posts || []);
        } else {
          showError('Failed to load user posts');
        }
      } catch (error) {
        showError('Error loading posts');
      } finally {
        setPostsLoading(false);
      }
    };
    fetchUserPosts();
  }, [user?.id, userId]); // Only re-fetch when user or userId changes

  const handleLikeToggle = async (postId: string, isLiked: boolean) => {
    // Update local state only - no need to refresh entire profile
    setPosts(prevPosts => prevPosts.map(post => 
      post.id === postId ? { ...post, likes_count: post.likes_count + (isLiked ? 1 : -1) } : post
    ));
    // Update user's likes_received count locally
    if (user) setUser({ ...user, likes_received: (user.likes_received || 0) + (isLiked ? 1 : -1) });
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const response = await authenticatedFetch(`${API_BASE}/api/profile/posts/${postId}`, { method: 'DELETE' });
      const result = await response.json();
      if (response.ok) {
        // Remove the deleted post from the local state
        setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
        // Update posts_count locally instead of full profile refresh
        if (user) setUser({ ...user, posts_count: Math.max(0, (user.posts_count || 0) - 1) });
        // Use success message from backend
        showSuccess(result.message || 'Post deleted successfully!');
      } else {
        showError(result.message || 'Failed to delete post');
      }
    } catch (error) {
      showError('Error deleting post');
    }
  };

  const handlePostUpdated = async (updatedPost: Post) => {
    // Update local state immediately - no need to refetch all posts
    setPosts(prevPosts => prevPosts.map(post => post.id === updatedPost.id ? updatedPost : post));
  };

  const handleCreatePost = () => {
    navigate('/create');
  };

  const handleShareProfile = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showSuccess('Profile link copied to clipboard');
    } catch {
      showError('Unable to copy link. Please copy the URL manually.');
    }
  };

  const handleEditProfile = () => {
    navigate('/profile/edit');
  };

  if (loading) {
    return (
      <div className="profile-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }
  if (!user) {
  return (
    <div className="profile-container">
        <div className="error-state">
          <h2>Profile Not Found</h2>
          <p>Unable to load profile data. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-content-wrapper">
          <div className="profile-header-section">
            {/* Left Side: Avatar, Username, Edit Button */}
            <div className="profile-left-section">
          <LetterAvatar name={user.username} size="large" />
              <h1 className="profile-username">{user.username}</h1>
              <div className="profile-actions-row">
                {isOwnProfile && (
                  <button className="profile-action-btn" onClick={handleEditProfile}>
                    Edit Profile
                  </button>
                )}
                <button className="profile-action-btn" onClick={handleShareProfile}>
                  Share Profile
                </button>
          </div>
        </div>

            {/* Right Side: Name, Stats and Details */}
            <div className="profile-right-section">
              {(user.fullname || user.username) && <div className="profile-fullname">{user.fullname || user.username}</div>}
              <div className="profile-stats-row">
        <div className="stat-item">
            <span className="stat-number">{user.posts_count || posts.length}</span>
                  <span className="stat-label">posts</span>
        </div>
        <div className="stat-item">
            <span className="stat-number">{user.likes_received || 0}</span>
                  <span className="stat-label">likes</span>
                </div>
              </div>

              <div className="profile-details-info">
                {user.bio && <div className="profile-bio">{user.bio}</div>}
                <div className="profile-join-date">
                  <FaCalendarAlt className="profile-icon" />
                  Joined {formatDisplayDate(user.created_at)}
                </div>
              </div>
          </div>
        </div>
        </div>
      </div>

      {/* Posts Section */}
      <div className="profile-posts-section">
        <div className="posts-header">
          <div className="posts-title-section">
          <h3>
              <FaCode className="posts-icon" />
              {isOwnProfile ? 'My Posts' : `${user.username}'s Posts`}
          </h3>
            <span className="posts-count">{posts.length} posts</span>
          </div>
          {isOwnProfile && (
          <button className="create-post-btn" onClick={handleCreatePost}>
              <FaPlus className="create-icon" />
            Create New Post
          </button>
          )}
        </div>

        {postsLoading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading posts...</p>
          </div>
        ) : posts.length === 0 ? (
        <div className="no-posts">
          <h4>No Posts Yet</h4>
        </div>
        ) : (
          <div className="posts-grid">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onDelete={isOwnProfile ? handleDeletePost : undefined}
                onPostUpdated={handlePostUpdated}
                onLikeToggle={handleLikeToggle}
                currentUserId={currentUserId || undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
