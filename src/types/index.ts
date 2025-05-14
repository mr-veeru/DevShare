/**
 * @fileoverview Core type definitions for the application
 * This file contains interfaces for the main data models used throughout the app
 */

/**
 * User interface represents a user in the system
 * Used for authentication, profiles, and user-related features
 */
export interface User {
    uid: string;
    email: string;
    username?: string;
    displayName?: string;
    photoURL?: string;
    bio?: string;
    createdAt?: string;
    updatedAt?: string;
}

/**
 * Post interface represents content shared by users
 * Contains all data needed for displaying and interacting with posts
 */
export interface Post {
    id: string;
    userId: string;
    title: string;
    content: string;
    code?: string;
    language?: string;
    tags?: string[];
    likes?: number;
    createdAt: string;
    updatedAt?: string;
    user?: User;
}

/**
 * Comment interface represents user responses to posts
 * Supports threaded conversations through the replies property
 */
export interface Comment {
    id: string;
    postId: string;
    userId: string;
    content: string;
    likes?: number;
    createdAt: string;
    updatedAt?: string;
    user?: User;
    replies?: Comment[];
}

/**
 * Generic API response wrapper
 * Provides consistent structure for all API responses
 */
export interface ApiResponse<T> {
    data?: T;
    error?: string;
    message?: string;
} 