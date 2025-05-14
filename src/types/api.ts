// Type definitions for API responses

export interface Comment {
  id: string;
  text: string;
  userId: string;
  username: string;
  postId: string;
  createdAt: string;
  editedAt?: string;
  parentId?: string;
  likes?: number;
  deleted?: boolean;
  replies?: Comment[];
}

export interface LikesResponse {
  data: string[];
  count: number;
  userLiked: boolean;
}

export interface UserProfile {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  photoURL?: string;
  username?: string;
  bio?: string;
  skills?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface Post {
  id: string;
  userId: string;
  title: string;
  username: string;
  description: string;
  createdAt: number;
  githubLink?: string;
  skills?: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: 'like' | 'comment' | 'reply' | 'mention';
  read: boolean;
  createdAt: string;
  postId?: string;
  postTitle?: string;
  commentId?: string;
  commentText?: string;
  actorId: string;
  actorName: string;
}

export interface SuccessResponse {
  success: boolean;
}

export interface ErrorResponse {
  error: boolean;
  message: string;
} 