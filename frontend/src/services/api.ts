import axios from 'axios';
import { auth } from '../config/firebase';

// Create an axios instance with base URL
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api'
});

// Get current user token for authentication
const getToken = async () => {
  const user = auth.currentUser;
  if (!user) return null;
  return await user.getIdToken();
};

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Generic error handler
const handleError = (error: any, action: string) => {
  console.error(`Error ${action}:`, error);
  let errorMessage = `Failed to ${action}`;
  
  if (error.response) {
    // Server responded with error
    const message = error.response.data?.error || error.response.data?.message;
    if (message) errorMessage = message;
  } else if (error.request) {
    // No response received
    errorMessage = 'Server did not respond. Please check your connection.';
  }
  
  return {
    error: true,
    message: errorMessage
  };
};

// Generic API request wrapper
const apiRequest = async (method: string, endpoint: string, data?: any) => {
  try {
    const response = await api({
      method,
      url: endpoint,
      data
    });
    return response.data;
  } catch (error) {
    return handleError(error, `${method} ${endpoint}`);
  }
};

// Posts API
export const getPosts = async () => {
  try {
    const response = await api.get('/posts');
    return response.data;
  } catch (error) {
    return handleError(error, 'fetching posts');
  }
};

export const getPostById = async (postId: string) => {
  try {
    const response = await api.get(`/posts/${postId}`);
    return response.data;
  } catch (error) {
    return handleError(error, 'fetching post');
  }
};

export const createPost = async (postData: any) => {
  return apiRequest('post', '/posts', postData);
};

export const updatePost = async (postId: string, postData: any) => {
  return apiRequest('put', `/posts/${postId}`, postData);
};

export const deletePost = async (postId: string) => {
  return apiRequest('delete', `/posts/${postId}`);
};

// Likes API
export const getLikes = async (postId: string) => {
  return apiRequest('get', `/posts/${postId}/likes`);
};

export const likePost = async (postId: string) => {
  return apiRequest('post', `/posts/${postId}/likes`);
};

export const unlikePost = async (postId: string) => {
  return apiRequest('delete', `/posts/${postId}/likes`);
};

// Comments API
export const getComments = async (postId: string) => {
  return apiRequest('get', `/comments/${postId}`);
};

export const createComment = async (postId: string, commentData: any) => {
  return apiRequest('post', `/comments/${postId}`, commentData);
};

export const updateComment = async (commentId: string, commentData: any) => {
  return apiRequest('put', `/comments/${commentId}`, commentData);
};

export const deleteComment = async (commentId: string) => {
  return apiRequest('delete', `/comments/${commentId}`);
};

// Comment Likes API
export const getCommentLikes = async (commentId: string) => {
  return apiRequest('get', `/comments/${commentId}/likes`);
};

export const likeComment = async (commentId: string) => {
  return apiRequest('post', `/comments/${commentId}/likes`);
};

export const unlikeComment = async (commentId: string) => {
  return apiRequest('delete', `/comments/${commentId}/likes`);
};

// Replies API
export const getReplies = async (commentId: string) => {
  return apiRequest('get', `/comments/${commentId}/replies`);
};

export const createReply = async (commentId: string, replyData: any) => {
  return apiRequest('post', `/comments/${commentId}/replies`, replyData);
};

export const updateReply = async (replyId: string, replyData: any) => {
  return apiRequest('put', `/comments/replies/${replyId}`, replyData);
};

export const deleteReply = async (replyId: string) => {
  return apiRequest('delete', `/comments/replies/${replyId}`);
};

// User Profile API
export const getUserProfile = async () => {
  return apiRequest('get', '/users/profile/');
};

export const updateUserProfile = async (profileData: any) => {
  return apiRequest('put', '/users/profile/', profileData);
};

// Notifications API
export const getNotifications = async () => {
  return apiRequest('get', '/notifications');
};

export const markNotificationAsRead = async (notificationId: string) => {
  return apiRequest('put', `/notifications/${notificationId}`, { read: true });
};

export const deleteNotification = async (notificationId: string) => {
  return apiRequest('delete', `/notifications/${notificationId}`);
};

export const markAllNotificationsAsRead = async () => {
  return apiRequest('put', '/notifications/read-all');
};

// Authentication
export const verifyUser = async () => {
  try {
    const token = await getToken();
    if (!token) throw new Error('No user logged in');
    
    const response = await api.post('/auth/verify/', {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    return handleError(error, 'verifying user');
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