/**
 * @fileoverview Create Post Component
 * Handles creation of new project posts with form validation,
 * file uploads, and error handling. Supports GitHub links
 * and skill tags.
 */

import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useNavigate } from "react-router-dom";
import { useState } from 'react';
import { FaGithub, FaLaptopCode, FaAlignLeft, FaHeading, FaPaperPlane, FaRegLightbulb } from 'react-icons/fa';
import './CreatePost.css';

/**
 * Interface for form data structure
 */
interface CreateFormData {
    title: string;
    description: string;
    githubLink: string | null;
    skills: string | null;
}

/**
 * CreatePost Component
 * Form for creating new project posts
 */
const CreatePost = () => {
    const [user] = useAuthState(auth);
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Validation schema
    const schema = yup.object().shape({
        title: yup.string().required('You must add a Title'),
        description: yup.string().required('You must add a Description'),
        githubLink: yup.string()
            .url('Must be a valid URL')
            .matches(/github\.com/, 'Must be a GitHub URL')
            .transform((value) => value === "" ? null : value)
            .nullable(),
        skills: yup.string()
            .transform((value) => value === "" ? null : value)
            .nullable(),
    }) as yup.ObjectSchema<CreateFormData>;

    // Initialize form with validation
    const { 
        register, 
        handleSubmit, 
        formState: { errors } 
    } = useForm<CreateFormData>({
        resolver: yupResolver<CreateFormData>(schema),
        defaultValues: {
            title: '',
            description: '',
            githubLink: null,
            skills: null,
        }
    });

    /**
     * Handle form submission
     * @param {CreateFormData} data - Form data
     */
    const onCreatePost = async (data: CreateFormData) => {
        if (!user) return;
        
        setIsSubmitting(true);
        try {
            const postsRef = collection(db, "posts");
            await addDoc(postsRef, {
                // Post data
                title: data.title,
                description: data.description,
                githubLink: data.githubLink,
                skills: data.skills,
                // User data
                userId: user.uid,
                username: user.displayName,
                // Metadata
                createdAt: serverTimestamp(),
            });

            navigate("/feed");
        } catch (error) {
            console.error("Error creating post:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onCreatePost)} className="create-form">
            <div className="form-header">
                <h1 className="form-title">
                    <FaRegLightbulb /> Share Your Project
                </h1>
                <p className="form-subtitle">
                    Let the community see what you've been working on
                </p>
            </div>
            
            {/* Title Field */}
            <div className="form-group">
                <label htmlFor="title" className="form-label">
                    <FaHeading /> Project Title
                </label>
                <input 
                    id="title"
                    className="input-title" 
                    placeholder="What's your project called?" 
                    {...register('title')} 
                />
                {errors.title?.message && (
                    <p className="error-message">{errors.title.message}</p>
                )}
            </div>
            
            {/* Description Field */}
            <div className="form-group">
                <label htmlFor="description" className="form-label">
                    <FaAlignLeft /> Project Description
                </label>
                <textarea 
                    id="description"
                    className="input-description" 
                    placeholder="Describe what your project does and why it's awesome!" 
                    rows={5}
                    {...register('description')} 
                />
                {errors.description?.message && (
                    <p className="error-message">{errors.description.message}</p>
                )}
            </div>
            
            {/* GitHub Link Field */}
            <div className="form-group">
                <label htmlFor="githubLink" className="form-label">
                    <FaGithub /> GitHub Repository (Optional)
                </label>
                <input 
                    id="githubLink"
                    className="input-github" 
                    placeholder="https://github.com/username/repository" 
                    {...register('githubLink')} 
                />
                {errors.githubLink?.message && (
                    <p className="error-message">{errors.githubLink.message}</p>
                )}
                <p className="form-helper">
                    Share your repository to let others explore your code
                </p>
            </div>
            
            {/* Skills Field */}
            <div className="form-group">
                <label htmlFor="skills" className="form-label">
                    <FaLaptopCode /> Skills Used (Optional)
                </label>
                <input 
                    id="skills"
                    className="input-skills" 
                    placeholder="e.g., React, Firebase, TypeScript, Node.js" 
                    {...register('skills')} 
                />
                {errors.skills?.message && (
                    <p className="error-message">{errors.skills.message}</p>
                )}
                <p className="form-helper">
                    Add comma-separated technologies you used in this project
                </p>
            </div>
            
            {/* Submit Button */}
            <button 
                className="submit-button" 
                type="submit"
                disabled={isSubmitting}
            >
                <FaPaperPlane /> 
                {isSubmitting ? 'Submitting...' : 'Share Project'}
            </button>
        </form>
    );
};

export default CreatePost;