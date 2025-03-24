import React from 'react';
import './LoadingSpinner.css';
import '../../styles/animations.css';

interface LoadingSpinnerProps {
    size?: 'small' | 'medium' | 'large';
    className?: string;
    text?: string;
    fullPage?: boolean;
    color?: string;
}

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