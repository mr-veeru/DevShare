/**
 * Notifications Page
 * 
 * Placeholder page for upcoming notifications functionality.
 * Will display user activity and community interactions.
 */

import React, { useEffect, useState, useCallback } from 'react';
import './Notifications.css';
import { authenticatedFetch, API_BASE, refreshNotificationCount } from '../../utils/auth';
import { useToast } from '../../components/common/Toast/Toast';
import { useNavigate } from 'react-router-dom';
import LetterAvatar from '../../components/common/LetterAvatar/LetterAvatar';
import ConfirmModal from '../../components/common/ConfirmModal/ConfirmModal';
import { formatDisplayDate } from '../../utils/date';
import { FaHeart, FaComment, FaCheck, FaTrash, FaClock } from 'react-icons/fa';

type Actor = { id: string; username: string; email: string } | null;
type NotificationItem = {
  id: string;
  type: string;
  message?: string | null;
  actor: Actor;
  post_id?: string | null;
  post_title?: string | null;
  comment_id?: string | null;
  reply_id?: string | null;
  comment_content?: string | null;
  read: boolean;
  created_at?: string | null;
};

interface NotificationsProps {
  unreadCount?: number;
  onCountRefresh?: () => void; // Callback to refresh count from backend
}

const Notifications: React.FC<NotificationsProps> = ({ unreadCount: propUnreadCount = 0, onCountRefresh }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const { showError, showSuccess } = useToast();
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmType, setConfirmType] = useState<'single' | 'clear_all'>('single');
  const [confirmTargetId, setConfirmTargetId] = useState<string | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const fetchNotifications = useCallback(async (pageNum: number = 1, reset: boolean = false) => {
    try {
      if (reset) setLoading(true);
      const res = await authenticatedFetch(`${API_BASE}/api/notifications?page=${pageNum}&limit=20`);
      if (!res.ok) throw new Error('Failed to load notifications');
      const items: NotificationItem[] = await res.json();
      const total = Number(res.headers.get('X-Total-Count') || '0');
      const limit = Number(res.headers.get('X-Limit') || '20');

      if (reset) {
        setNotifications(items);
      } else {
        setNotifications(prev => [...prev, ...items]);
      }
      setHasMore(pageNum * limit < total);
      setPage(pageNum);
    } catch (e) {
      showError('Unable to fetch notifications');
      if (reset) setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchNotifications(1, true);
  }, [fetchNotifications]);

  const markAllRead = async () => {
    if (markingAll) return;
    setMarkingAll(true);
    try {
      const res = await authenticatedFetch(`${API_BASE}/api/notifications/mark_all_read`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to mark all as read');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      // Refresh count from backend (source of truth)
      refreshNotificationCount();
      showSuccess('All notifications marked as read');
    } catch (e) {
      showError('Failed to mark all as read');
    } finally {
      setMarkingAll(false);
    }
  };

  const markOneRead = async (id: string) => {
    try {
      const res = await authenticatedFetch(`${API_BASE}/api/notifications/${id}/read`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed');
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
      // Refresh count from backend (source of truth)
      refreshNotificationCount();
    } catch (e) {
      showError('Failed to update notification');
    }
  };

  const openConfirmDelete = (id: string) => {
    setConfirmType('single');
    setConfirmTargetId(id);
    setConfirmOpen(true);
  };

  const deleteOneInner = async (id: string) => {
    try {
      const res = await authenticatedFetch(`${API_BASE}/api/notifications/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Failed to delete notification' }));
        throw new Error(errorData.message || 'Failed to delete notification');
      }
      const data = await res.json().catch(() => ({}));
      setNotifications(prev => prev.filter(n => n.id !== id));
      // Refresh count from backend (source of truth)
      refreshNotificationCount();
      showSuccess(data.message || 'Notification deleted successfully');
    } catch (e: any) {
      showError(e.message || 'Failed to delete notification');
    }
  };

  const openConfirmClearAll = () => {
    setConfirmType('clear_all');
    setConfirmTargetId(null);
    setConfirmOpen(true);
  };

  const clearAllInner = async () => {
    try {
      const res = await authenticatedFetch(`${API_BASE}/api/notifications/clear_all`, { method: 'POST' });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Failed to clear notifications' }));
        throw new Error(errorData.message || 'Failed to clear notifications');
      }
      const data = await res.json().catch(() => ({}));
      setNotifications([]);
      setHasMore(false);
      // Refresh count from backend (source of truth)
      refreshNotificationCount();
      const deletedCount = data.deleted || 0;
      showSuccess(`Successfully deleted ${deletedCount} notification${deletedCount !== 1 ? 's' : ''}`);
    } catch (e: any) {
      showError(e.message || 'Failed to clear notifications');
    }
  };

  const getNotificationMessage = (n: NotificationItem) => {
    const name = n.actor?.username || 'Someone';
    const postTitle = n.post_title ? `'${n.post_title}'` : '';
    const commentContent = n.comment_content ? `"${n.comment_content}"` : '';
    
    switch (n.type) {
      case 'post_liked':
        return {
          text: `${name} liked your post ${postTitle}`,
          icon: FaHeart,
          iconColor: '#ef4444'
        };
      case 'comment_added':
        return {
          text: `${name} commented on your post ${postTitle}`,
          icon: FaComment,
          iconColor: '#3b82f6'
        };
      case 'comment_liked':
        return {
          text: `${name} liked your comment on ${postTitle} ${commentContent ? commentContent : ''}`,
          icon: FaHeart,
          iconColor: '#ef4444'
        };
      case 'reply_added':
        return {
          text: `${name} replied to your comment on ${postTitle} ${commentContent ? commentContent : ''}`,
          icon: FaComment,
          iconColor: '#3b82f6'
        };
      case 'reply_liked':
        return {
          text: `${name} liked your reply on ${postTitle} ${commentContent ? commentContent : ''}`,
          icon: FaHeart,
          iconColor: '#ef4444'
        };
      default:
        return {
          text: 'You have a new notification',
          icon: FaComment,
          iconColor: '#3b82f6'
        };
    }
  };


  const handleOpen = async (n: NotificationItem) => {
    // Mark as read optimistically
    if (!n.read) markOneRead(n.id).catch(() => {});

    // Navigate to post view
    const postId = n.post_id;
    const commentId = n.comment_id || undefined;
    const replyId = n.reply_id || undefined;
    if (postId) {
      const qp = new URLSearchParams();
      if (commentId) qp.set('commentId', commentId);
      if (replyId) qp.set('replyId', replyId);
      navigate(`/post/${postId}${qp.toString() ? `?${qp.toString()}` : ''}`);
    }
  };

  return (
    <div className="page-container">
      <div className="notifications-header">
        <div className="notifications-title-section">
          <h1 className="notifications-title">Notifications</h1>
          {propUnreadCount > 0 && (
            <span className="notifications-count-badge">{propUnreadCount}</span>
          )}
        </div>
        <div className="notifications-actions">
          <button 
            className="notification-action-link" 
            onClick={markAllRead} 
            disabled={markingAll || notifications.length === 0 || notifications.every(n => n.read)}
          >
            <FaCheck className="action-icon" />
            Mark all read
          </button>
          <button 
            className="notification-action-link" 
            onClick={openConfirmClearAll}
            disabled={notifications.length === 0}
          >
            <FaTrash className="action-icon" />
            Clear all
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner spinner--large"></div>
          <p>Loading notifications...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="empty-state">
          <h3>No notifications yet</h3>
          <p>Activity related to your posts and comments will appear here.</p>
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.map(n => {
            const msgInfo = getNotificationMessage(n);
            const IconComponent = msgInfo.icon;
            return (
              <div 
                key={n.id} 
                className={`notification-item ${n.read ? 'read' : 'unread'}`} 
                onClick={() => handleOpen(n)}
              >
                <div className="notification-left">
                  <LetterAvatar name={n.actor?.username || 'U'} size="medium" />
                  <div className="notification-icon-wrapper" style={{ color: msgInfo.iconColor }}>
                    <IconComponent className="notification-type-icon" />
                  </div>
                </div>
                <div className="notification-content">
                  <div className="notification-text">{msgInfo.text}</div>
                  {n.created_at && (
                    <div className="notification-time">
                      <FaClock className="time-icon" />
                      {formatDisplayDate(n.created_at)}
                    </div>
                  )}
                </div>
                <div className="notification-actions" onClick={(e) => e.stopPropagation()}>
                  {!n.read && (
                    <button 
                      className="notification-action-btn" 
                      onClick={() => markOneRead(n.id)}
                      title="Mark as read"
                    >
                      <FaCheck className="action-icon" />
                    </button>
                  )}
                  <button 
                    className="notification-action-btn" 
                    onClick={() => openConfirmDelete(n.id)}
                    title="Delete"
                  >
                    <FaTrash className="action-icon" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hasMore && !loading && (
        <div className="load-more">
          <button className="load-more-btn" onClick={() => fetchNotifications(page + 1)}>Load more</button>
        </div>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        open={confirmOpen}
        title={confirmType === 'single' ? 'Delete notification' : 'Clear all notifications'}
        description={confirmType === 'single' ? 'Are you sure you want to delete this notification?' : 'Are you sure you want to delete all notifications? This action cannot be undone.'}
        confirmLabel={confirmType === 'single' ? 'Delete' : 'Clear all'}
        loading={confirmBusy}
        onClose={() => setConfirmOpen(false)}
        onConfirm={async () => {
          if (confirmBusy) return;
          setConfirmBusy(true);
          try {
            if (confirmType === 'single' && confirmTargetId) {
              await deleteOneInner(confirmTargetId);
            } else if (confirmType === 'clear_all') {
              await clearAllInner();
            }
            setConfirmOpen(false);
          } finally {
            setConfirmBusy(false);
          }
        }}
      />
    </div>
  );
};

export default Notifications;
