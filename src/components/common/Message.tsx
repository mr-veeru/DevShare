/**
 * @fileoverview Message Component
 * A reusable notification component that displays success or error messages
 * with appropriate icons and a close button.
 */

import React from 'react';
import { FaCheckCircle, FaExclamationCircle, FaTimes } from 'react-icons/fa';
import { MessageType } from './useAutoMessage';
import './Message.css';

/**
 * Props interface for the Message component
 * @interface MessageProps
 * @property {'success' | 'error'} type - Type of message to display
 * @property {string} message - Content of the message
 * @property {() => void} onClose - Handler for closing the message
 */
interface MessageProps {
  type: Exclude<MessageType, null>;
  message: string;
  onClose: () => void;
}

/**
 * Message Component
 * Displays a notification message with an icon and close button
 */
export const Message: React.FC<MessageProps> = ({ type, message, onClose }) => {
  // Determine which icon to use based on message type
  const Icon = type === 'success' ? FaCheckCircle : FaExclamationCircle;

  return (
    <div className={`message message-${type}`}>
      <Icon className="message-icon" />
      <span className="message-content">{message}</span>
      <button 
        className="message-close"
        onClick={onClose}
        aria-label="Close message"
      >
        <FaTimes />
      </button>
    </div>
  );
}; 