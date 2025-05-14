/**
 * @fileoverview Password Toggle Hook
 * A custom hook that manages password visibility state in form inputs.
 * Used across login and registration forms for consistent password field behavior.
 */

import { useState } from 'react';

/**
 * Hook for managing password visibility states
 * @returns {Object} Object containing password visibility states and toggle functions
 * @property {boolean} showPassword - Current password visibility state
 * @property {boolean} showConfirmPassword - Current confirm password visibility state
 * @property {() => void} togglePasswordVisibility - Function to toggle password visibility
 * @property {() => void} toggleConfirmPasswordVisibility - Function to toggle confirm password visibility
 */
export const usePasswordToggle = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    const togglePasswordVisibility = () => setShowPassword(!showPassword);
    const toggleConfirmPasswordVisibility = () => setShowConfirmPassword(!showConfirmPassword);
    
    return { 
        showPassword, 
        showConfirmPassword,
        togglePasswordVisibility,
        toggleConfirmPasswordVisibility
    };
}; 