/**
 * Register Component
 * 
 * Handles new user registration with email and password.
 * Features form validation with react-hook-form, loading states,
 * and comprehensive error handling.
 */

import { useState } from "react";
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { FaUser, FaEnvelope, FaLock, FaUserPlus, FaEye, FaEyeSlash, FaCode, FaSun, FaMoon } from 'react-icons/fa';
import './auth.css';
import { useNavigate, Link } from "react-router-dom";
import { auth, db } from "../../config/firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAutoMessage, Message } from '../../components/common';
import { usePasswordToggle } from './usePasswordToggle';
import { useTheme } from '../../context/ThemeContext';

// Define the form data structure
type RegisterFormData = {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
};

const Register = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const { 
        showPassword, 
        showConfirmPassword,
        togglePasswordVisibility,
        toggleConfirmPasswordVisibility 
    } = usePasswordToggle();
    const { message, showMessage, clearMessage } = useAutoMessage();
    const { theme, toggleTheme } = useTheme();
    
    // Define validation schema using Yup
    const schema = yup.object().shape({
        username: yup.string().required('Username is required'),
        email: yup.string().email('Invalid email').required('Email is required'),
        password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
        confirmPassword: yup.string()
            .required('Please confirm your password')
            .oneOf([yup.ref('password')], 'Passwords must match')
    });
    
    // Initialize form handling with react-hook-form
    const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
        resolver: yupResolver(schema)
    });

    /**
     * Check if a username already exists in the database
     * @param {string} username - Username to check
     * @returns {Promise<boolean>} - True if username exists, false otherwise
     */
    const checkUsernameExists = async (username: string) => {
        try {
            const postsRef = collection(db, "posts");
            const q = query(postsRef, where("username", "==", username));
            const querySnapshot = await getDocs(q);
            return !querySnapshot.empty;
        } catch (error) {
            console.error("Error checking username:", error);
            throw error;
        }
    };

    /**
     * Handle form submission for user registration
     * @param {RegisterFormData} data - Form data
     */
    const onSubmit = async (data: RegisterFormData) => { 
        try {
            setIsLoading(true);

            const usernameExists = await checkUsernameExists(data.username);
            if (usernameExists) {
                showMessage('error', "Username already exists. Please choose a different one.");
                return;
            }

            const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
            const user = userCredential.user;

            await updateProfile(user, {
                displayName: data.username
            });

            showMessage('success', "Registration successful! Redirecting...");
            
            setTimeout(() => {
                navigate("/feed");
            }, 2000);
        } catch (error: any) {
            console.error("Error registering user:", error.message);
            
            // Handle specific Firebase error codes
            if (error.code === "auth/email-already-in-use") {
                showMessage('error', "This email is already in use. Please try another one.");
            } else if (error.code === "auth/weak-password") {
                showMessage('error', "Password is too weak. Please use a stronger password.");
            } else {
                showMessage('error', error.message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-background"></div>
            <div className="auth-card">
                <div className="auth-card-header">
                    <div className="auth-logo">
                        <h1><FaCode /> DevShare</h1>
                        <p className="auth-tagline">Connect. Share. Build.</p>
                    </div>
                    <button 
                        className="auth-theme-toggle"
                        onClick={toggleTheme}
                        aria-label={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                    >
                        {theme === 'light' ? <FaMoon /> : <FaSun />}
                    </button>
                    <h2 className="auth-title">Create Account</h2>
                    <p className="auth-subtitle">Join our developer community to share your projects and skills</p>
                </div>
                
                <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
                    <div className="form-group">
                        <label htmlFor="username">
                            <FaUser className="input-icon" /> Username
                        </label>
                        <input
                            id="username"
                            type="text"
                            placeholder="Your username"
                            {...register("username")}
                            className={errors.username ? "input-error" : ""}
                        />
                        {errors.username && (
                            <p className="error-message">{errors.username.message}</p>
                        )}
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="email">
                            <FaEnvelope className="input-icon" /> Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            placeholder="youremail@example.com"
                            {...register("email")}
                            className={errors.email ? "input-error" : ""}
                        />
                        {errors.email && (
                            <p className="error-message">{errors.email.message}</p>
                        )}
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="password">
                            <FaLock className="input-icon" /> Password
                        </label>
                        <div className="password-input-container">
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="Create a password"
                                {...register("password")}
                                className={errors.password ? "input-error" : ""}
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={togglePasswordVisibility}
                            >
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                        {errors.password && (
                            <p className="error-message">{errors.password.message}</p>
                        )}
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="confirmPassword">
                            <FaLock className="input-icon" /> Confirm Password
                        </label>
                        <div className="password-input-container">
                            <input
                                id="confirmPassword"
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Confirm your password"
                                {...register("confirmPassword")}
                                className={errors.confirmPassword ? "input-error" : ""}
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={toggleConfirmPasswordVisibility}
                            >
                                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                        {errors.confirmPassword && (
                            <p className="error-message">{errors.confirmPassword.message}</p>
                        )}
                    </div>
                    
                    <button
                        type="submit"
                        className="auth-button primary-button"
                        disabled={isLoading}
                    >
                        <FaUserPlus /> Create Account
                        {isLoading && <span className="button-loader"></span>}
                    </button>
                    
                    {message.text && (
                        <Message
                            type={message.type as 'success' | 'error'}
                            message={message.text}
                            onClose={clearMessage}
                        />
                    )}
                </form>
                
                <div className="auth-footer">
                    Already have an account? <Link to="/">Sign In</Link>
                </div>
            </div>
        </div>
    );
};

export default Register;
