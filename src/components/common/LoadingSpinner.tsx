/**
 * @fileoverview Loading Spinner Component
 * A versatile loading indicator that can be used throughout the application
 * to indicate loading states with customizable size, color, and text.
 */

import React from 'react';
import './LoadingSpinner.css';
import '../../styles/animations.css';

/**
 * Props interface for the LoadingSpinner component
 * @property {'small' | 'medium' | 'large'} size - Size variant of the spinner
 * @property {string} className - Optional CSS class name
 * @property {string} text - Optional text to display below spinner
 * @property {boolean} fullPage - Whether spinner should take up full page
 * @property {string} color - Optional custom color for the spinner
 */
interface LoadingSpinnerProps {
    size?: 'small' | 'medium' | 'large';
    className?: string;
    text?: string;
    fullPage?: boolean;
    color?: string;
}

/**
 * Loading Spinner Component
 * Displays an animated loading indicator with optional text
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'medium',
    className = '',
    text,
    fullPage = false,
    color
}) => {
    const spinnerClasses = [
        'loading-spinner',
        `loading-spinner--${size}`,
        className
    ].filter(Boolean).join(' ');

    // Apply color style if provided
    const spinnerStyle = color ? { borderTopColor: color } : undefined;
    
    // Determine container class based on fullPage prop
    const containerClass = fullPage ? "loading-spinner-fullpage" : "loading-spinner-container";
    
    // Determine text class based on fullPage prop
    const textClass = fullPage ? "loading-text" : "loading-spinner__text";

    return (
        <div className={containerClass}>
            <div className={spinnerClasses} style={spinnerStyle} />
            {text && <span className={textClass}>{text}</span>}
        </div>
    );
}; 