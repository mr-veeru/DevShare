/**
 * Create Post Page
 * 
 * Form for creating and submitting new posts to the developer community.
 * Supports file uploads, tech stack tags, GitHub links, and rich content.
 */

import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaImage, FaPaperPlane } from 'react-icons/fa';
import { useToast } from '../../components/common/Toast/Toast';
import { FilePreview } from '../../components/common/FilePreview/FilePreview';
import { authenticatedFetch, API_BASE } from '../../utils/auth';
import './CreatePost.css';

interface PostData {
  title: string;
  description: string;
  tags: string[];
  githubUrl: string;
  mediaFiles: File[];
}

const CreatePost: React.FC = () => {
  const navigate = useNavigate();
  const [postData, setPostData] = useState<PostData>({
    title: '',
    description: '',
    tags: [],
    githubUrl: '',
    mediaFiles: []
  });
  
  const [currentTech, setCurrentTech] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showSuccess, showError } = useToast();

  const handleInputChange = (field: keyof PostData, value: any) => {
    setPostData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddTech = () => {
    if (currentTech.trim() && !postData.tags.includes(currentTech.trim())) {
      setPostData(prev => ({
        ...prev,
        tags: [...prev.tags, currentTech.trim()]
      }));
      setCurrentTech('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setPostData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTech();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Store files for upload with the post
    const newFiles = Array.from(files);
    setPostData(prev => ({
      ...prev,
      mediaFiles: [...prev.mediaFiles, ...newFiles]
    }));
    
    showSuccess('Files selected! They will be uploaded when you create the post.');
    
    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Only validate and submit if not already submitting
    if (isSubmitting) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Prepare form data for backend (multipart/form-data)
      const formData = new FormData();
      formData.append('title', postData.title.trim());
      formData.append('description', postData.description.trim());
      formData.append('github_link', postData.githubUrl.trim() || '');
      
      // Add tech_stack (technologies) as comma-separated string
      if (postData.tags.length === 0) {
        showError('Please add at least one technology to the tech stack');
        setIsSubmitting(false);
        return;
      }
      formData.append('tech_stack', postData.tags.join(','));
      
      // Add files
      postData.mediaFiles.forEach(file => {
        formData.append('files', file);
      });

      // Call backend API to create post
      const response = await authenticatedFetch(`${API_BASE}/api/posts`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        // Backend validation errors
        if (result.errors) {
          const errorMessages = Object.values(result.errors).flat();
          showError(errorMessages.join(', '));
        } else {
          showError(result.message || 'Failed to create post. Please try again.');
        }
        return;
      }
      
      showSuccess('Project posted successfully! 🎉');
      
      // Reset form
      setPostData({
        title: '',
        description: '',
        tags: [],
        githubUrl: '',
        mediaFiles: []
      });
      setCurrentTech('');
      
      // Redirect to feed after a short delay
      setTimeout(() => {
        navigate('/feed');
      }, 1000);
      
    } catch (error: any) {
      showError(error.message || 'Failed to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
        <div className="page-container">
          <div className="page-header">
            <div className="page-title">
              <span className="code-icon">&lt;/&gt;</span>
              <h1>Create Post</h1>
            </div>
            <p className="page-subtitle">Share your amazing projects with the developer community</p>
          </div>

      <div className="create-post-container">
        <form onSubmit={handleSubmit} className="create-post-form">

          {/* Title Input */}
          <div className="form-group">
            <label htmlFor="post-title">Title *</label>
            <input
              id="post-title"
              type="text"
              placeholder="What's your post about?"
              value={postData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="title-input"
              maxLength={100}
            />
            <div className="char-count">{postData.title.length}/100</div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="post-description">Description *</label>
            <textarea
              id="post-description"
              placeholder="Describe your project, what it does, technologies used, and what makes it special..."
              value={postData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="content-textarea"
              rows={6}
            />
            <div className="char-count">{postData.description.length}/500</div>
          </div>

          {/* GitHub URL */}
          <div className="form-group">
            <label htmlFor="github-url" className="optional">GitHub URL</label>
            <input
              id="github-url"
              type="url"
              placeholder="https://github.com/username/repository"
              value={postData.githubUrl}
              onChange={(e) => handleInputChange('githubUrl', e.target.value)}
              className="github-input"
            />
          </div>

          {/* Tech Stack Input */}
          <div className="form-group">
            <label htmlFor="post-tags">Tech Stack *</label>
            <div className="tech-input-container">
              <input
                id="post-tags"
                type="text"
                placeholder="Add technology..."
                value={currentTech}
                onChange={(e) => setCurrentTech(e.target.value)}
                onKeyPress={handleKeyPress}
                className="tech-input"
              />
              <button
                type="button"
                onClick={handleAddTech}
                className="add-tech-btn"
                disabled={!currentTech.trim()}
              >
                Add
              </button>
            </div>
            {postData.tags.length > 0 && (
              <div className="tech-tags">
                {postData.tags.map((tag, index) => (
                  <span key={index} className="tech-tag-editable">
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="remove-tag-btn"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Media Upload */}
          <div className="form-group">
            <label className="optional">Media</label>
            <div className="media-upload">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".txt,.md,.pdf,.py,.js,.ts,.html,.css,.json,.xml,.zip,.rar,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.bmp,.svg,.webp,.mp4,.avi,.mov,.wmv,.flv,.mkv"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="upload-btn"
                disabled={isSubmitting}
              >
                <FaImage className="icon" />
                {isSubmitting ? 'Uploading...' : 'Upload Files'}
              </button>
              
              {postData.mediaFiles.length > 0 && (
                <div className="media-preview">
                  {postData.mediaFiles.map((file, index) => (
                    <div key={index} className="media-item">
                      <FilePreview
                        filename={file.name}
                        contentType={file.type}
                        size={file.size}
                        onRemove={() => {
                          const newFiles = postData.mediaFiles.filter((_, i) => i !== index);
                          handleInputChange('mediaFiles', newFiles);
                        }}
                        showRemove={true}
                        className="media-preview-item"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="form-actions">
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="spinner spinner--small"></div>
                  Creating Post...
                </>
              ) : (
                <>
                  <FaPaperPlane className="icon" />
                  Create Post
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePost;