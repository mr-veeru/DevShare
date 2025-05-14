/**
 * @fileoverview Letter Avatar Component
 * Renders a circular avatar with user initials.
 * Supports multiple sizes and custom styling.
 * Used across the application for consistent user representation.
 */

import React from 'react';
import './LetterAvatar.css';

/**
 * Props interface for LetterAvatar component
 * @property {string | null | undefined} name - User's name
 * @property {'small' | 'medium' | 'large'} size - Avatar size variant
 * @property {string} className - Optional CSS class name
 * @property {() => void} onClick - Optional click handler
 * @property {boolean} interactive - Whether the avatar is interactive
 * @property {string} aria-label - Accessibility label
 */
interface LetterAvatarProps {
  name?: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
  'aria-label'?: string;
}

/**
 * Letter Avatar Component
 * Displays user initials in a circular avatar
 * Falls back to "?" if no name is provided
 */
export const LetterAvatar: React.FC<LetterAvatarProps> = ({ 
  name = '', 
  size = 'medium', 
  className = '',
  onClick,
  interactive = false,
  'aria-label': ariaLabel
}) => {
  const letter = name ? name[0].toUpperCase() : '?';
  // Generate a consistent color based on the name
  const colorClass = name ? `color-${name.charCodeAt(0) % 5}` : 'color-0';
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  const accessibilityProps = {
    role: interactive || onClick ? 'button' : undefined,
    tabIndex: interactive || onClick ? 0 : undefined,
    onClick: onClick,
    onKeyDown: onClick ? handleKeyDown : undefined,
    'aria-label': ariaLabel || (name ? `${name}'s avatar` : 'User avatar')
  };

  return (
    <div 
      className={`letter-avatar ${size} ${colorClass} ${className} ${interactive || onClick ? 'interactive' : ''}`}
      {...accessibilityProps}
    >
      {letter}
    </div>
  );
}; 