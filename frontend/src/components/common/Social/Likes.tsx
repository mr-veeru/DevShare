/**
 * Likes Component
 * 
 * Manages like/unlike functionality for posts with state synchronization.
 * Features like count display, likes list modal, and user-specific like status.
 */

import React, { useState, useEffect } from 'react';
import { FaHeart, FaRegHeart } from 'react-icons/fa';
import { authenticatedFetch, API_BASE, refreshNotificationCount } from '../../../utils/auth';
import { useToast } from '../Toast/Toast';
import LetterAvatar from '../LetterAvatar/LetterAvatar';
import '../common.css';
import './Likes.css';
import { formatDisplayDate } from '../../../utils/date';
import { UserInfo } from '../../../types';

interface LikesProps {
  postId: string;
  initialLikesCount: number;
  initialLiked: boolean;
  currentUserId?: string; // Pass current user ID to avoid multiple profile calls
  onLikeToggle?: (liked: boolean, count: number) => void;
}

interface Like {
  id: string;
  user: UserInfo;
  post_id: string;
  created_at: string;
}

const Likes: React.FC<LikesProps> = ({ 
  postId, 
  initialLikesCount, 
  initialLiked, 
  currentUserId,
  onLikeToggle 
}) => {
  const [liked, setLiked] = useState(initialLiked);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [loading, setLoading] = useState(false);
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [likesList, setLikesList] = useState<Like[]>([]);
  const [loadingLikes, setLoadingLikes] = useState(false);
  const [hasCheckedLikeStatus, setHasCheckedLikeStatus] = useState(false);
  const { showError } = useToast();

  // Check if current user has liked this post (only once on mount)
  useEffect(() => {
    if (!currentUserId || hasCheckedLikeStatus) return;
    
    const checkLikeStatus = async () => {
      try {
        const response = await authenticatedFetch(`${API_BASE}/api/social/likes/posts/${postId}/likes`);
        if (response.ok) {
          const likes = await response.json();
          setLiked(likes.some((like: Like) => like.user.id === currentUserId));
        }
      } catch (error) {
        // Could not check like status, use initial value
      } finally {
        setHasCheckedLikeStatus(true);
      }
    };

    checkLikeStatus();
  }, [postId, currentUserId, hasCheckedLikeStatus]);

  // Toggle like status and update count
  const handleLikeToggle = async () => {
    if (loading) return;
    setLoading(true);
    
    try {
      const response = await authenticatedFetch(`${API_BASE}/api/social/likes/posts/${postId}/like`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        setLiked(data.liked);
        setLikesCount(data.likes_count);
        onLikeToggle?.(data.liked, data.likes_count);
        // Refresh notification count from backend to ensure accuracy
        // (Notification is created for post owner, not the liker)
        refreshNotificationCount();
      } else {
        const error = await response.json().catch(() => ({}));
        showError(error.message || 'Failed to update like status');
      }
    } catch (error) {
      showError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch and display list of users who liked this post
  const handleShowLikes = async () => {
    if (likesCount === 0) return;
    
    setLoadingLikes(true);
    setShowLikesModal(true);
    
    try {
      const response = await authenticatedFetch(`${API_BASE}/api/social/likes/posts/${postId}/likes`);
      
      if (response.ok) {
        setLikesList(await response.json());
      } else {
        const error = await response.json().catch(() => ({}));
        showError(error.message || 'Failed to load likes');
        setShowLikesModal(false);
      }
    } catch (error) {
      showError('Network error. Please try again.');
      setShowLikesModal(false);
    } finally {
      setLoadingLikes(false);
    }
  };

  const handleCloseModal = () => {
    setShowLikesModal(false);
    setLikesList([]);
  };

  return (
    <>
      <div className="likes-container">
        <button 
          className={`like-btn ${liked ? 'liked' : ''} ${loading ? 'loading' : ''}`}
          onClick={handleLikeToggle}
          disabled={loading}
          title={liked ? 'Unlike' : 'Like'}
        >
          {liked ? <FaHeart className="action-icon" /> : <FaRegHeart className="action-icon" />}
        </button>
        
        <button 
          className="likes-count-btn"
          onClick={handleShowLikes}
          disabled={likesCount === 0}
          title="View who liked this post"
        >
          {likesCount}
        </button>
      </div>

      {/* Likes Modal */}
      {showLikesModal && (
        <div className="likes-modal-overlay" onClick={handleCloseModal}>
          <div className="likes-modal" onClick={(e) => e.stopPropagation()}>
            <div className="likes-modal-header">
              <h3>Likes ({likesCount})</h3>
              <button className="close-btn" onClick={handleCloseModal}>
                ×
              </button>
            </div>
            
            <div className="likes-modal-content">
              {loadingLikes ? (
                <div className="loading-spinner">Loading...</div>
              ) : (
                <div className="likes-list">
                  {likesList.map((like) => (
                    <div key={like.id} className="like-item">
                      <LetterAvatar name={like.user.username || 'User'} size="small" />
                      <div className="like-user-info">
                        <div className="like-username">{like.user.username}</div>
                        <div className="like-email">{like.user.email}</div>
                      </div>
                      <div className="like-date">{formatDisplayDate(like.created_at)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Likes;
