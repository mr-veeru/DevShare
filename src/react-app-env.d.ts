/**
 * @fileoverview Type definitions for the React application
 * This file contains custom type definitions used throughout the application
 * for better type safety and development experience.
 */

/// <reference types="react-scripts" />

// Application loading states used for async operations
type LoadingState = 'idle' | 'loading' | 'succeeded' | 'failed';

// Custom error interface for consistent error handling
interface CustomError {
  code?: string;
  message: string;
}

// Extended Firebase User interface with required properties
interface AuthUser extends firebase.User {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  uid: string;
}
