/**
 * Shared Type Definitions
 * 
 * Centralized type definitions used across the application.
 */

export interface User {
  id: string;
  username: string;
  fullname?: string;
  bio?: string;
  email: string;
  created_at: string;
  posts_count?: number;
  likes_received?: number;
}

export interface Post {
  id: string;
  title: string;
  description: string;
  tech_stack?: string[];
  github_link?: string;
  files?: Array<{
    file_id: string;
    filename: string;
    content_type: string;
    size: number;
  }>;
  user_id: string;
  author?: {
    username: string;
    id: string;
  };
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at?: string;
}

export interface UserInfo {
  id: string;
  username: string;
  email?: string;
}

export interface Comment {
  id: string;
  content: string;
  user: UserInfo;
  post_id?: string;
  replies?: Reply[];
  replies_count?: number;
  likes_count?: number;
  liked?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Reply {
  id: string;
  content: string;
  user: UserInfo;
  comment_id: string;
  post_id: string;
  created_at: string;
  likes_count?: number;
  liked?: boolean;
}

export interface Like {
  id: string;
  user: UserInfo;
  created_at: string;
}
