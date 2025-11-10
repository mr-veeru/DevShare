/**
 * PostCard Component
 * 
 * Displays individual post cards in the feed with full functionality.
 * Features: content preview, tech stack tags, file attachments, GitHub links,
 * and social interactions (likes, comments, sharing, edit/delete for owners).
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaGithub, FaEllipsisV, FaComment, FaShare, FaWhatsapp, FaInstagram, FaFacebook, FaCopy, FaEdit, FaTrash, FaSave, FaTimes } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import LetterAvatar from '../LetterAvatar/LetterAvatar';
import { FilePreview } from '../FilePreview/FilePreview';
import { downloadFile } from '../../../utils/fileUtils';
import Likes from '../Social/Likes';
import Comments from '../Social/Comments';
import { useToast } from '../Toast/Toast';
import ConfirmModal from '../ConfirmModal/ConfirmModal';
import { authenticatedFetch, API_BASE } from '../../../utils/auth';
import './PostCard.css';
import { formatRelative } from '../../../utils/date';
import { Post } from '../../../types';

interface PostCardProps {
  post: Post;
  onComment?: (postId: string) => void;
  onShare?: (postId: string) => void;
  onEdit?: (post: Post) => void;
  onDelete?: (postId: string) => void;
  onLikeToggle?: (postId: string, isLiked: boolean) => void;
  onPostUpdated?: (updatedPost: Post) => void;
  searchQuery?: string;
  highlightText?: (text: string, query: string) => React.ReactNode;
  currentUserId?: string;
  autoOpenComments?: boolean;
  highlightCommentId?: string;
  highlightReplyId?: string;
  [dataAttr: string]: any;
}

const PostCard: React.FC<PostCardProps> = ({
  post,
  onComment,
  onShare,
  onEdit,
  onDelete,
  onLikeToggle,
  onPostUpdated,
  searchQuery = '',
  highlightText,
  currentUserId,
  autoOpenComments,
  highlightCommentId,
  highlightReplyId,
  ...rest
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAllFiles, setShowAllFiles] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentsCount, setCommentsCount] = useState<number>(post.comments_count);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title);
  const [editDescription, setEditDescription] = useState(post.description);
  const [editTechStack, setEditTechStack] = useState(post.tech_stack || []);
  const [editGithubLink, setEditGithubLink] = useState(post.github_link || '');
  const [newTech, setNewTech] = useState('');
  const [filesToKeep, setFilesToKeep] = useState<string[]>(post.files?.map(f => f.file_id) || []);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showSuccess, showError } = useToast();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  useEffect(() => {
    if (autoOpenComments) setShowComments(true);
  }, [autoOpenComments]);

  const truncateDescription = (description: string, maxLength: number = 200) => 
    description.length <= maxLength ? description : description.substring(0, maxLength) + '...';

  const handleFileDownload = async (file: { file_id: string; filename: string; content_type: string }) => {
    await downloadFile(post.id, file.file_id, file.filename, (error) => {
      showError(error);
    });
  };

  const navigate = useNavigate();
  const getUserDisplayName = () => post.author?.username || `User ${post.user_id.slice(-4)}`;
  const getPostUrl = () => `${window.location.origin}/post/${post.id}`;
  const getShareText = () => `Check out this post by ${getUserDisplayName()}: "${post.title}"`;
  const isPostOwner = currentUserId && post.user_id === currentUserId;
  
  const handleProfileClick = (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    const userId = post.author?.id || post.user_id;
    if (userId) navigate(`/profile/${userId}`);
  };

  const profileClickProps = {
    onClick: handleProfileClick,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleProfileClick(e);
      }
    },
    role: 'button' as const,
    tabIndex: 0
  };

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.className = 'clipboard-textarea';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    } catch {
      return false;
    }
  };

  const handleShare = async (platform: string) => {
    const url = getPostUrl();
    const text = getShareText();
    const shareText = text + ' ' + url;
    
    const shareUrls = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(shareText)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
    };
    
    if (shareUrls[platform as keyof typeof shareUrls]) {
      window.open(shareUrls[platform as keyof typeof shareUrls], '_blank');
    } else if (platform === 'instagram') {
      const tempLink = document.createElement('a');
      tempLink.href = 'instagram://direct';
      tempLink.style.display = 'none';
      document.body.appendChild(tempLink);
      tempLink.click();
      document.body.removeChild(tempLink);
      
      const copySuccess = await copyToClipboard(shareText);
      setTimeout(() => {
        window.open('https://www.instagram.com/direct/inbox/', '_blank');
        showSuccess(copySuccess ? 'Instagram opened! Link copied to clipboard for easy pasting.' : 'Instagram opened! Please copy the link manually.');
      }, 500);
    } else if (platform === 'copy') {
      const copyResult = await copyToClipboard(url);
      showSuccess(copyResult ? 'Link copied successfully!' : 'Please copy the link manually from the address bar.');
    }
    setShowShareModal(false);
  };

  const resetEditForm = () => {
    setEditTitle(post.title);
    setEditDescription(post.description);
    setEditTechStack(post.tech_stack || []);
    setEditGithubLink(post.github_link || '');
    setFilesToKeep(post.files?.map(f => f.file_id) || []);
    setNewFiles([]);
    setNewTech('');
  };

  const handleEdit = () => {
    resetEditForm();
    setIsEditing(true);
    setShowMenu(false);
  };

  const addTech = () => {
    const tech = newTech.trim();
    if (tech && !editTechStack.includes(tech)) {
      setEditTechStack([...editTechStack, tech]);
      setNewTech('');
    }
  };

  const removeTech = (tech: string) => setEditTechStack(editTechStack.filter(t => t !== tech));

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setNewFiles(prev => [...prev, ...files]);
    fileInputRef.current && (fileInputRef.current.value = '');
    showSuccess(`${files.length} file(s) added successfully!`);
  };

  const handleRemoveExistingFile = (fileId: string) => setFilesToKeep(filesToKeep.filter(id => id !== fileId));
  const handleRemoveNewFile = (index: number) => setNewFiles(newFiles.filter((_, i) => i !== index));

  const handleSave = async () => {
    if (isSaving) return;
    
    if (!editTitle.trim() || !editDescription.trim()) {
      showError('Title and description are required');
      return;
    }

    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append('title', editTitle.trim());
      formData.append('description', editDescription.trim());
      
      // Add tech_stack as individual array items (not JSON string)
      editTechStack.forEach(tech => {
        formData.append('tech_stack', tech);
      });
      
      formData.append('github_link', editGithubLink || '');
      
      if (post.files && post.files.length > 0) {
        filesToKeep.forEach(fileId => formData.append('existing_files', fileId));
        if (filesToKeep.length === 0) formData.append('existing_files', '');
      }
      newFiles.forEach(file => formData.append('files', file));

      const response = await authenticatedFetch(`${API_BASE}/api/profile/posts/${post.id}`, {
        method: 'PUT',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to update post');
      }

      const updatedPost = await response.json();
      onPostUpdated?.(updatedPost);
      setIsEditing(false);
      showSuccess('Post updated successfully!');
    } catch (error: any) {
      showError(error.message || 'Failed to update post');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    resetEditForm();
    setIsEditing(false);
  };

  const handleDelete = () => { setShowDeleteConfirm(true); setShowMenu(false); };
  const confirmDelete = () => { onDelete?.(post.id); setShowDeleteConfirm(false); };
  const cancelDelete = () => setShowDeleteConfirm(false);
  const shareOptions = [
    { key: 'whatsapp', icon: FaWhatsapp, label: 'WhatsApp' },
    { key: 'twitter', icon: FaXTwitter, label: 'X (Twitter)' },
    { key: 'facebook', icon: FaFacebook, label: 'Facebook' },
    { key: 'instagram', icon: FaInstagram, label: 'Instagram' },
    { key: 'copy', icon: FaCopy, label: 'Copy Link' }
  ];

  return (
    <div className="post-card" {...rest}>
      {/* Post Header */}
      <div className="post-header">
        <div className="post-author">
          <div className="post-avatar-clickable" {...profileClickProps} aria-label={`View ${getUserDisplayName()}'s profile`}>
            <LetterAvatar name={getUserDisplayName()} size="medium" />
          </div>
          <div className="author-info">
            <span className="author-name clickable" {...profileClickProps}>{getUserDisplayName()}</span>
            <span className="post-date">{formatRelative(post.created_at)}</span>
          </div>
        </div>
        {isPostOwner && (
          <div className="post-menu-container" ref={menuRef}>
            <button 
              className="post-menu"
              onClick={() => setShowMenu(!showMenu)}
            >
              <FaEllipsisV className="post-menu-icon" />
            </button>
            
            {showMenu && (
              <div className="post-menu-dropdown">
                <button className="menu-item" onClick={handleEdit}>
                  <FaEdit className="menu-icon" />
                  Edit Post
                </button>
                <button className="menu-item delete" onClick={handleDelete}>
                  <FaTrash className="menu-icon" />
                  Delete Post
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Post Content */}
      <div className="post-content">
        {isEditing ? (
          <>
            <input
              type="text"
              className="post-edit-title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Post Title *"
            />
            <textarea
              className="post-edit-description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Post Description *"
              rows={4}
            />
            
            {/* Tech Stack Editor */}
            <div className="post-edit-tech">
              <span className="tech-label">SKILLS *</span>
              <div className="tech-input-container">
                <input
                  type="text"
                  value={newTech}
                  onChange={(e) => setNewTech(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTech())}
                  placeholder="Add technology..."
                  className="tech-input"
                />
                <button type="button" onClick={addTech} className="add-tech-btn">
                  Add
                </button>
              </div>
              {editTechStack.length > 0 && (
                <div className="tech-tags">
                  {editTechStack.map((tech, index) => (
                    <span key={index} className="tech-tag-editable">
                      #{tech}
                      <button type="button" onClick={() => removeTech(tech)} className="remove-tag-btn">
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* GitHub Link Editor */}
            <div className="post-edit-github">
              <span className="tech-label">GITHUB REPOSITORY</span>
              <input
                type="url"
                className="post-edit-github-input"
                value={editGithubLink}
                onChange={(e) => setEditGithubLink(e.target.value)}
                placeholder="https://github.com/username/repository"
              />
            </div>

            {/* Files Editor */}
            <div className="post-edit-files">
              <span className="tech-label">FILES</span>
              <div className="media-upload">
                {/* Existing Files List */}
                {post.files && post.files.length > 0 && filesToKeep.length > 0 && (
                  <div className="media-preview">
                    {post.files
                      .filter(file => filesToKeep.includes(file.file_id))
                      .map((file) => (
                        <div key={file.file_id} className="media-item">
                          <FilePreview
                            filename={file.filename}
                            contentType={file.content_type}
                            size={file.size}
                            onRemove={() => handleRemoveExistingFile(file.file_id)}
                            showRemove={true}
                            className="media-preview-item"
                          />
                        </div>
                      ))}
                  </div>
                )}
                
                {/* Show message if all files were removed */}
                {filesToKeep.length === 0 && newFiles.length === 0 && post.files && post.files.length > 0 && (
                  <div className="no-files-message">
                    All files have been removed. Add new files below if needed.
                  </div>
                )}
                
                {/* Upload Button */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  accept=".txt,.md,.readme,.log,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.bmp,.svg,.webp,.mp4,.avi,.mov,.wmv,.flv,.mkv,.zip,.rar,.7z,.tar,.gz,.py,.js,.jsx,.ts,.tsx,.html,.css,.scss,.sass,.java,.cpp,.c,.h,.hpp,.php,.rb,.go,.rs,.swift,.kt,.scala,.sh,.bat,.ps1,.json,.xml,.yaml,.yml,.csv,.sql,.exe,.msi,.dmg,.deb,.rpm,.ini,.cfg,.conf,.env,.gitignore,.dockerfile"
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="upload-btn"
                >
                  <span>📎</span>
                  Upload Files
                </button>
                
                {/* New Files Preview */}
                {newFiles.length > 0 && (
                  <div className="media-preview">
                    {newFiles.map((file, index) => (
                      <div key={index} className="media-item">
                        <FilePreview
                          filename={file.name}
                          contentType={file.type}
                          size={file.size}
                          onRemove={() => handleRemoveNewFile(index)}
                          showRemove={true}
                          className="media-preview-item"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="post-edit-actions">
              <button className="cancel-btn-inline" onClick={handleCancel} disabled={isSaving}>
                <FaTimes className="action-icon" />
                Cancel
              </button>
              <button className="save-btn-inline" onClick={handleSave} disabled={isSaving}>
                <FaSave className="action-icon" />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="post-title">
              {highlightText ? highlightText(post.title, searchQuery) : post.title}
            </h3>
            <div className="post-description">
              <p>{highlightText ? highlightText(isExpanded ? post.description : truncateDescription(post.description), searchQuery) : (isExpanded ? post.description : truncateDescription(post.description))}</p>
              {post.description.length > 200 && (
                <button className="read-more-btn" onClick={() => setIsExpanded(!isExpanded)}>
                  {isExpanded ? 'Read less' : 'Read more'}
                </button>
              )}
            </div>
            
            {/* Tech Stack Display */}
            {post.tech_stack && post.tech_stack.length > 0 && (
              <div className="post-tech-stack">
                <span className="tech-label">SKILLS</span>
                <div className="tech-tags">
                  {post.tech_stack.map((tech, index) => (
                    <span key={index} className="tech-tag">
                      #{highlightText ? highlightText(tech, searchQuery) : tech}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Files - only show in non-edit mode */}
        {!isEditing && post.files && post.files.length > 0 && (
          <div className="post-files">
            <div className="files-label">FILES</div>
            <div className="files-grid">
              {post.files.slice(0, showAllFiles ? post.files.length : 2).map((file, index) => (
                <div key={file.file_id} className="file-item">
                  <FilePreview
                    filename={file.filename}
                    contentType={file.content_type}
                    size={file.size}
                    onDownload={() => handleFileDownload(file)}
                  />
                </div>
              ))}
              {post.files.length > 2 && (
                <div className="file-more" onClick={() => setShowAllFiles(!showAllFiles)}>
                  {showAllFiles ? 'Show less' : `+${post.files.length - 2} more files`}
                </div>
              )}
            </div>
          </div>
        )}

        {/* GitHub Link - only show in non-edit mode */}
        {!isEditing && post.github_link && (
          <div className="post-github">
            <a 
              href={post.github_link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="github-link"
            >
              <FaGithub className="github-icon" />
              View project on GitHub →
            </a>
          </div>
        )}
      </div>

      {/* Post Actions */}
      <div className="post-actions">
        <Likes 
          postId={post.id}
          initialLikesCount={post.likes_count}
          initialLiked={false}
          currentUserId={currentUserId}
          onLikeToggle={onLikeToggle ? (liked: boolean, count: number) => onLikeToggle(post.id, liked) : undefined}
        />
        <button className="action-btn" onClick={() => setShowComments((v) => !v)}>
          <FaComment className="action-icon" />
          <span>{commentsCount}</span>
        </button>
        <button className="action-btn" onClick={() => setShowShareModal(!showShareModal)}>
          <FaShare className="action-icon" />
          <span>Share</span>
        </button>
      </div>
      {showComments && (
        <Comments 
          postId={post.id}
          currentUserId={currentUserId}
          onCountsChange={setCommentsCount}
          highlightCommentId={highlightCommentId}
          highlightReplyId={highlightReplyId}
        />
      )}

      {showShareModal && (
        <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="modal-content modal-content--share" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Share</h3>
              <button className="close-btn" onClick={() => setShowShareModal(false)}>×</button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <div className="share-options">
                {shareOptions.map(({ key, icon: Icon, label }) => (
                  <button key={key} className="share-option" onClick={() => handleShare(key)}>
                    <Icon className="share-icon" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={showDeleteConfirm}
        title="Delete Post"
        description="Are you sure you want to delete this post? This action cannot be undone."
        confirmLabel="Delete"
        onClose={cancelDelete}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default PostCard;
