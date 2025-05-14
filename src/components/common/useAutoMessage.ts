/**
 * @fileoverview Auto Message Hook
 * A custom hook that manages temporary message display with automatic cleanup.
 * Useful for showing success/error notifications that automatically disappear.
 */

import { useState, useEffect, useCallback } from 'react';

/** Type for message types - export for reuse */
export type MessageType = 'success' | 'error' | null;

/** Interface for message state */
interface Message {
  type: MessageType;
  text: string | null;
}

/**
 * Custom hook for managing auto-dismissing messages
 * @param {number} duration - Duration in milliseconds before message is cleared
 * @returns {Object} Message state and control functions
 */
export const useAutoMessage = (duration: number = 5000) => {
  // Message state with type and text
  const [message, setMessage] = useState<Message>({ type: null, text: null });

  /**
   * Clear the current message
   */
  const clearMessage = useCallback(() => {
    setMessage({ type: null, text: null });
  }, []);

  // Auto-cleanup effect
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => {
        clearMessage();
      }, duration);

      // Cleanup timer on unmount or when message changes
      return () => clearTimeout(timer);
    }
  }, [message.text, duration, clearMessage]);

  /**
   * Display a new message
   * @param {MessageType} type - Type of message to show
   * @param {string} text - Message content
   */
  const showMessage = useCallback((type: Exclude<MessageType, null>, text: string) => {
    setMessage({ type, text });
  }, []);

  /**
   * Show a success message
   */
  const showSuccess = useCallback((text: string) => {
    showMessage('success', text);
  }, [showMessage]);

  /**
   * Show an error message
   */
  const showError = useCallback((text: string) => {
    showMessage('error', text);
  }, [showMessage]);

  return {
    message,
    showMessage,
    clearMessage,
    showSuccess,
    showError
  };
}; 