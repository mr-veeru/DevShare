import axios from 'axios';
import { auth } from '../config/firebase';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Token cache to improve auth flow
let cachedToken = '';
let tokenExpiryTime = 0;

// Function to get a valid token with caching
const getValidToken = async (forceRefresh = false) => {
  const now = Date.now();
  
  // Return cached token if it's still valid (expire 5 mins before actual expiry)
  if (!forceRefresh && cachedToken && now < tokenExpiryTime) {
    return cachedToken;
  }
  
  const user = auth.currentUser;
  if (!user) return null;
  
  try {
    // Force token refresh if needed
    const token = await user.getIdToken(forceRefresh);
    
    // Get token expiration time (Firebase tokens expire in 1 hour by default)
    // Set cache to expire 5 minutes before actual expiry for safety
    tokenExpiryTime = now + (55 * 60 * 1000);
    cachedToken = token;
    
    return token;
  } catch (error) {
    console.error('Error refreshing auth token:', error);
    return null;
  }
};

// Create axios instance with defaults
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Don't allow redirects for OPTIONS (preflight) requests to avoid CORS issues
  maxRedirects: 0
});

// Add auth token to requests
api.interceptors.request.use(
  async (config) => {
    const token = await getValidToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor with retry logic for auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If the error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Wait a bit for auth to stabilize
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Force token refresh
        const token = await getValidToken(true);
        if (token) {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return axios(originalRequest);
        }
      } catch (refreshError) {
        console.error('Error during request retry:', refreshError);
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Helper function for API errors
const handleError = (error: any, operation: string) => {
  console.error(`Error ${operation}:`, error);
  throw error;
};

// Authentication
export const verifyUser = async () => {
  try {
    const token = await getValidToken();
    if (!token) throw new Error('No user logged in');
    
    const response = await api.post('/auth/verify/', {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    return handleError(error, 'verifying user');
  }
};

// User Profile
export const getUserProfile = async () => {
  try {
    const response = await api.get('/users/profile/');
    return response.data;
  } catch (error) {
    return handleError(error, 'getting user profile');
  }
};

export const updateUserProfile = async (profileData: any) => {
  try {
    const response = await api.put('/users/profile', profileData);
    return response.data;
  } catch (error) {
    return handleError(error, 'updating user profile');
  }
};

export const getUserByUsername = async (username: string) => {
  try {
    const response = await api.get(`/users/${username}`);
    return response.data;
  } catch (error) {
    return handleError(error, 'getting user by username');
  }
};

// Posts
export const getPosts = async () => {
  try {
    const response = await api.get('/posts/');
    return response.data;
  } catch (error) {
    return handleError(error, 'getting posts');
  }
};

export const getPost = async (postId: string) => {
  try {
    const response = await api.get(`/posts/${postId}`);
    return response.data;
  } catch (error) {
    return handleError(error, 'getting post');
  }
};

export const createPost = async (postData: any) => {
  try {
    const response = await api.post('/posts/', postData);
    return response.data;
  } catch (error) {
    return handleError(error, 'creating post');
  }
};

export const updatePost = async (postId: string, postData: any) => {
  try {
    const response = await api.put(`/posts/${postId}`, postData);
    return response.data;
  } catch (error) {
    return handleError(error, 'updating post');
  }
};

export const deletePost = async (postId: string) => {
  try {
    const response = await api.delete(`/posts/${postId}`);
    return response.data;
  } catch (error) {
    return handleError(error, 'deleting post');
  }
};

// Comments
export const getComments = async (postId: string) => {
  try {
    const response = await api.get(`/posts/${postId}/comments`);
    return response.data;
  } catch (error) {
    return handleError(error, 'getting comments');
  }
};

export const createComment = async (postId: string, commentData: any) => {
  try {
    const response = await api.post(`/posts/${postId}/comments`, commentData);
    return response.data;
  } catch (error) {
    return handleError(error, 'creating comment');
  }
};

export const updateComment = async (commentId: string, data: any) => {
  try {
    const response = await api.put(`/comments/${commentId}`, data);
    return response.data;
  } catch (error) {
    throw error;  // Let the component handle the error
  }
};

export const deleteComment = async (commentId: string) => {
  try {
    const response = await api.delete(`/comments/${commentId}`);
    return response.data;
  } catch (error) {
    throw error;  // Let the component handle the error
  }
};

// Comment Likes
export const getCommentLikes = async (commentId: string) => {
  try {
    const response = await api.get(`/comments/${commentId}/likes`);
    return response.data;
  } catch (error) {
    return handleError(error, 'getting comment likes');
  }
};

export const likeComment = async (commentId: string) => {
  try {
    const response = await api.post(`/comments/${commentId}/likes`);
    return response.data;
  } catch (error) {
    return handleError(error, 'liking comment');
  }
};

export const unlikeComment = async (commentId: string) => {
  try {
    const response = await api.delete(`/comments/${commentId}/likes`);
    return response.data;
  } catch (error) {
    return handleError(error, 'unliking comment');
  }
};

// Replies
export const getReplies = async (commentId: string) => {
  try {
    const response = await api.get(`/comments/${commentId}/replies`);
    return response.data;
  } catch (error) {
    return handleError(error, 'getting replies');
  }
};

export const createReply = async (commentId: string, replyData: any) => {
  try {
    const response = await api.post(`/comments/${commentId}/replies`, replyData);
    return response.data;
  } catch (error) {
    return handleError(error, 'creating reply');
  }
};

export const updateReply = async (replyId: string, data: any) => {
  try {
    const response = await api.put(`/comments/replies/${replyId}`, data);
    return response.data;
  } catch (error) {
    throw error;  // Let the component handle the error
  }
};

export const deleteReply = async (replyId: string) => {
  try {
    const response = await api.delete(`/comments/replies/${replyId}`);
    return response.data;
  } catch (error) {
    throw error;  // Let the component handle the error
  }
};

// Likes
export const getLikes = async (postId: string) => {
  try {
    const response = await api.get(`/posts/${postId}/likes`);
    return response.data;
  } catch (error) {
    return handleError(error, 'getting likes');
  }
};

export const likePost = async (postId: string) => {
  try {
    const response = await api.post(`/posts/${postId}/likes`);
    return response.data;
  } catch (error) {
    return handleError(error, 'liking post');
  }
};

export const unlikePost = async (postId: string) => {
  try {
    const response = await api.delete(`/posts/${postId}/likes`);
    return response.data;
  } catch (error) {
    return handleError(error, 'unliking post');
  }
};

// Notifications
export const getNotifications = async () => {
  try {
    const response = await api.get('/notifications');
    return response.data;
  } catch (error) {
    return handleError(error, 'getting notifications');
  }
};

export const createNotification = async (notificationData: any) => {
  try {
    const response = await api.post('/notifications', notificationData);
    return response.data;
  } catch (error) {
    return handleError(error, 'creating notification');
  }
};

export const updateNotification = async (notificationId: string, updateData: any) => {
  try {
    const response = await api.put(`/notifications/${notificationId}`, updateData);
    return response.data;
  } catch (error) {
    return handleError(error, 'updating notification');
  }
};

export const deleteNotification = async (notificationId: string) => {
  try {
    const response = await api.delete(`/notifications/${notificationId}`);
    return response.data;
  } catch (error) {
    return handleError(error, 'deleting notification');
  }
};

// Test endpoints
export const testBackend = async () => {
  try {
    const response = await api.get('/test');
    return response.data;
  } catch (error) {
    return handleError(error, 'testing backend');
  }
};

export const getProtectedData = async () => {
  try {
    const response = await api.get('/protected');
    return response.data;
  } catch (error) {
    return handleError(error, 'getting protected data');
  }
};

export default api; 