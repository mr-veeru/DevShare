/**
 * @fileoverview Consolidated Notifications Page
 * A dedicated page that displays all user notifications with options to mark as read and delete.
 * Contains all notification-related functionality, components and hooks.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  doc, 
  deleteDoc,
  writeBatch, 
  limit,
  Timestamp
} from 'firebase/firestore';
import { FaBell, FaCheck, FaTrash, FaHeart, FaComment, FaClock } from 'react-icons/fa';
import { auth, db } from '../../config/firebase';
import './NotificationsPage.css';

// Notification types
export enum NotificationType {
  LIKE = 'like',
  COMMENT = 'comment',
  COMMENT_LIKE = 'comment_like',
  REPLY = 'reply',
  REPLY_LIKE = 'reply_like',
}

// Notification interface
export interface Notification {
  id: string;
  recipientId: string;
  senderId: string;
  senderName: string;
  postId: string;
  postTitle: string;
  type: NotificationType;
  read: boolean;
  createdAt: Timestamp;
  commentId?: string;
  content?: string;
}

/**
 * Custom hook for managing notifications
 * @returns Notification management methods and state
 */
export const useNotifications = () => {
  const [user] = useAuthState(auth);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch notifications for the current user
   */
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    try {
      // Create query for notifications
      const notificationsRef = collection(db, 'notifications');
      const q = query(
        notificationsRef,
        where('recipientId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(20) // Limit to most recent 20 notifications
      );
      
      // Set up real-time listener
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const notificationsList: Notification[] = [];
        let unreads = 0;
        
        querySnapshot.forEach((doc) => {
          const notificationData = { id: doc.id, ...doc.data() } as Notification;
          
          // Skip notifications where the user is both sender and recipient (self-notifications)
          if (notificationData.senderId === user.uid && notificationData.recipientId === user.uid) {
            return;
          }
          
          notificationsList.push(notificationData);
          
          if (!notificationData.read) {
            unreads++;
          }
        });
        
        setNotifications(notificationsList);
        setUnreadCount(unreads);
        setLoading(false);
      }, (err) => {
        console.error("Error fetching notifications:", err);
        setError("Could not load notifications");
        setLoading(false);
      });
      
      // Clean up listener on unmount
      return () => unsubscribe();
    } catch (err) {
      console.error("Error setting up notifications listener:", err);
      setError("Could not set up notifications");
      setLoading(false);
    }
  }, [user]);

  /**
   * Mark a notification as read
   * @param notificationId ID of the notification to mark as read
   */
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user) return;
    
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, { read: true });
    } catch (err) {
      console.error("Error marking notification as read:", err);
      setError("Could not update notification");
    }
  }, [user]);
  
  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(async () => {
    if (!user || notifications.length === 0) return;
    
    try {
      const batch = writeBatch(db);
      
      notifications.forEach(notification => {
        if (!notification.read) {
          const notificationRef = doc(db, 'notifications', notification.id);
          batch.update(notificationRef, { read: true });
        }
      });
      
      await batch.commit();
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
      setError("Could not update notifications");
    }
  }, [user, notifications]);
  
  /**
   * Delete a notification
   * @param notificationId ID of the notification to delete
   */
  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!user) return;
    
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
    } catch (err) {
      console.error("Error deleting notification:", err);
      setError("Could not delete notification");
    }
  }, [user]);
  
  /**
   * Clear all notifications
   */
  const clearAllNotifications = useCallback(async () => {
    if (!user || notifications.length === 0) return;
    
    try {
      const batch = writeBatch(db);
      
      notifications.forEach(notification => {
        const notificationRef = doc(db, 'notifications', notification.id);
        batch.delete(notificationRef);
      });
      
      await batch.commit();
    } catch (err) {
      console.error("Error clearing notifications:", err);
      setError("Could not clear notifications");
    }
  }, [user, notifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications
  };
};

/**
 * NotificationItem Component
 * Renders a single notification with styling based on type and read status.
 */
interface NotificationItemProps {
  notification: Notification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ 
  notification, 
  onRead, 
  onDelete 
}) => {
  const navigate = useNavigate();
  
  // Format the timestamp
  const formatTime = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      
      if (isNaN(date.getTime())) {
        return 'Recently';
      }
      
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
      
      if (diffInSeconds < 60) return 'Just now';
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
      if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
      
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }).format(date);
    } catch (error) {
      return 'Recently';
    }
  };
  
  /**
   * Navigate to the post and mark notification as read
   */
  const handleClick = () => {
    // Mark as read first
    onRead(notification.id);
    
    // Navigate based on notification type
    if (notification.type === NotificationType.COMMENT_LIKE || notification.type === NotificationType.REPLY) {
      // Navigate to the specific comment if it's a comment-related notification
      navigate(`/post/${notification.postId}?comment=${notification.commentId}`);
    } else {
      // Otherwise just navigate to the post
      navigate(`/post/${notification.postId}`);
    }
  };
  
  return (
    <div 
      className={`notification-item ${!notification.read ? 'unread' : ''}`}
      onClick={handleClick}
    >
      <div className="notification-icon">
        {notification.type === NotificationType.LIKE ? (
          <FaHeart className="like-icon" />
        ) : notification.type === NotificationType.COMMENT ? (
          <FaComment className="comment-icon" />
        ) : notification.type === NotificationType.COMMENT_LIKE ? (
          <FaHeart className="like-icon comment-like" />
        ) : notification.type === NotificationType.REPLY ? (
          <FaComment className="reply-icon" />
        ) : (
          <FaBell />
        )}
      </div>
      
      <div className="notification-content">
        <div className="notification-text">
          <strong>{notification.senderName}</strong>
          {notification.type === NotificationType.LIKE 
            ? ' liked your post ' 
            : notification.type === NotificationType.COMMENT
            ? ' commented on your post '
            : notification.type === NotificationType.COMMENT_LIKE
            ? ' liked your comment on '
            : notification.type === NotificationType.REPLY
            ? ' replied to your comment on '
            : ' interacted with '}
          <strong>"{notification.postTitle}"</strong>
          
          {notification.content && 
           (notification.type === NotificationType.COMMENT ||
            notification.type === NotificationType.COMMENT_LIKE || 
            notification.type === NotificationType.REPLY) && (
            <div className="notification-comment-content">
              <blockquote>"{notification.content}"</blockquote>
            </div>
          )}
        </div>
        
        <div className="notification-time">
          <FaClock /> {formatTime(notification.createdAt)}
        </div>
      </div>
      
      <button 
        className="notification-delete" 
        onClick={(e) => {
          e.stopPropagation();
          onDelete(notification.id);
        }}
        aria-label="Delete notification"
      >
        <FaTrash />
      </button>
    </div>
  );
};

/**
 * NotificationsPage Component
 * Display all user notifications in a dedicated page
 */
const NotificationsPage: React.FC = () => {
  const { 
    notifications, 
    unreadCount, 
    loading, 
    error,
    markAsRead, 
    markAllAsRead, 
    deleteNotification, 
    clearAllNotifications 
  } = useNotifications();
  
  // When the component mounts, track page view
  useEffect(() => {
    document.title = 'Notifications | DevShare';
    
    // Scroll to top when navigating to this page
    window.scrollTo(0, 0);
  }, []);
  
  return (
    <div className="notifications-page">
      <div className="notifications-page-header">
        <h1>
          <FaBell /> Notifications 
          {unreadCount > 0 && <span className="notification-count">({unreadCount})</span>}
        </h1>
        {notifications.length > 0 && (
          <div className="notifications-actions">
            <button 
              className="mark-all-read-btn"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
            >
              <FaCheck /> Mark all read
            </button>
            <button 
              className="clear-all-btn"
              onClick={clearAllNotifications}
            >
              <FaTrash /> Clear all
            </button>
          </div>
        )}
      </div>
      
      <div className="notifications-page-content">
        {loading ? (
          <div className="notifications-loading">Loading notifications...</div>
        ) : error ? (
          <div className="notifications-error">{error}</div>
        ) : notifications.length === 0 ? (
          <div className="notifications-empty">
            <FaBell className="empty-icon" />
            <h3>No notifications yet</h3>
            <p>When someone likes or comments on your posts, or replies to your comments, you'll see it here.</p>
          </div>
        ) : (
          <div className="notifications-list">
            {notifications.map(notification => (
              <NotificationItem 
                key={notification.id}
                notification={notification}
                onRead={markAsRead}
                onDelete={deleteNotification}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage; 