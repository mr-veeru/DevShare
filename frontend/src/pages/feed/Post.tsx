/**
 * Post Component
 * 
 * A comprehensive social media post component that provides:
 * - Core Features:
 *   - Post content display (title, description, user info, skills)
 *   - Like/unlike functionality with optimistic UI updates
 *   - Expandable comment section with nested replies
 *   - Social sharing options (copy link, social platforms)
 *   - GitHub repository integration
 * 
 * - Technical Features:
 *   - Real-time Firestore integration
 *   - Optimistic UI updates for better UX
 *   - Error handling and loading states
 *   - Responsive design for all screen sizes
 *   - Accessibility compliance (ARIA labels, keyboard navigation)
 * 
 * @component
 * @param {IPost} post - The post data to display
 * @param {boolean} [isCommentsOpen] - Whether the comments section is expanded
 * @param {Function} [onCommentToggle] - Callback for comment section toggle
 * @param {Function} [onPostUpdate] - Callback for updating post data
 * @param {string} [searchQuery] - The search query to highlight text
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../../config/firebase";
import { FaComment, FaShare, FaEllipsisV, FaGithub, FaWhatsapp, FaTwitter, FaFacebook, FaCopy, FaHeart, FaRegHeart, FaChevronDown, FaChevronUp, FaEdit, FaTrash, FaSave, FaTimes } from "react-icons/fa";
import { Link } from "react-router-dom";
import CommentSection from "./CommentSection";
import "./Post.css";
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'react-toastify';
import { 
  getLikes,
  likePost,
  unlikePost,
  deletePost,
  updatePost,
  getComments
} from '../../services/api';
import { ConfirmationDialog, LetterAvatar } from '../../components/common';

interface PostProps {
  post: {
    id: string;
    title: string;
    description: string;
    username: string;
    userId: string;
    createdAt: any;
    githubLink?: string;
    skills?: string;
    likes?: number;
  };
  isCommentsOpen?: boolean;
  onCommentToggle?: (postId: string) => void;
  onPostUpdate?: (postId: string, post: any) => void;
  searchQuery?: string;
}

interface Comment {
  id: string;
  text: string;
  userId: string;
  username: string;
  createdAt: any;
  parentId?: string;
  replies?: Comment[];
  deleted?: boolean;
}

function Post(props: PostProps) {
  const [user] = useAuthState(auth);
  const { post: initialPost, isCommentsOpen = false, onCommentToggle, onPostUpdate, searchQuery } = props;
  const [post, setPost] = useState(initialPost);
  const [likes, setLikes] = useState<number>(0);
  const [liked, setLiked] = useState<boolean>(false);
  // Comments state used for storing data that's passed to CommentSection
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [comments, setComments] = useState<Comment[]>([]);
  const [totalCommentCount, setTotalCommentCount] = useState<number>(0);
  const [showOptions, setShowOptions] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedTitle, setEditedTitle] = useState<string>(initialPost.title);
  const [editedDescription, setEditedDescription] = useState<string>(initialPost.description);
  const [editedSkills, setEditedSkills] = useState<string>(initialPost.skills || '');
  const [editedGithubLink, setEditedGithubLink] = useState<string>(initialPost.githubLink || '');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  const shareButtonRef = useRef<HTMLButtonElement>(null);
  const optionsMenuRef = useRef<HTMLDivElement>(null);
  const optionsButtonRef = useRef<HTMLButtonElement>(null);

  // Update local state when props change
  useEffect(() => {
    setPost(initialPost);
    setEditedTitle(initialPost.title);
    setEditedDescription(initialPost.description);
    setEditedSkills(initialPost.skills || '');
    setEditedGithubLink(initialPost.githubLink || '');
  }, [initialPost]);

  // Close share options when post ID changes (navigating between posts)
  useEffect(() => {
    setShowShareOptions(false);
  }, [post.id]);

  // Close share options when comments are opened
  useEffect(() => {
    if (isCommentsOpen) {
      setShowShareOptions(false);
    }
  }, [isCommentsOpen]);

  // Add a useEffect to handle clicks outside the options menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Handle clicks outside the share menu
      if (showShareOptions &&
          shareMenuRef.current &&
          shareButtonRef.current &&
          !shareMenuRef.current.contains(event.target as Node) &&
          !shareButtonRef.current.contains(event.target as Node)) {
        setShowShareOptions(false);
      }
      
      // Handle clicks outside the options menu
      if (showOptions &&
          optionsMenuRef.current &&
          optionsButtonRef.current &&
          !optionsMenuRef.current.contains(event.target as Node) &&
          !optionsButtonRef.current.contains(event.target as Node)) {
        setShowOptions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showShareOptions, showOptions]);

  const fetchLikesAndComments = useCallback(async () => {
    try {
      // Fetch likes
      const likesData = await getLikes(post.id);
      if (likesData && typeof likesData.count === 'number') {
        setLikes(likesData.count);
        setLiked(likesData.userLiked || false);
      } else {
        console.warn("Invalid likes data format:", likesData);
        setLikes(0);
        setLiked(false);
      }

      // Fetch comments
      const commentsData = await getComments(post.id);
      if (Array.isArray(commentsData)) {
        // Count both top-level comments and their replies
        let totalCount = 0;
        
        // Process the comments array to count all comments and replies
        commentsData.forEach((comment: Comment) => {
          // Only count the comment if it's not deleted
          if (!comment.deleted) {
            // Count the top-level comment
            totalCount++;
            
            // If this is a top-level comment with replies, count those too
            if (!comment.parentId && comment.replies && Array.isArray(comment.replies)) {
              // Only count non-deleted replies
              totalCount += comment.replies.filter((reply: Comment) => !reply.deleted).length;
            }
          }
        });
        
        setComments(commentsData);
        setTotalCommentCount(totalCount);
      } else {
        console.warn("Invalid comments data format:", commentsData);
        setComments([]);
        setTotalCommentCount(0);
      }
    } catch (error) {
      console.error("Error fetching post data:", error);
      toast.error("Failed to load post data");
    }
  }, [post.id]);

  useEffect(() => {
    fetchLikesAndComments();
  }, [fetchLikesAndComments]);

  const handleLike = async () => {
    if (!user) {
      toast.error("You must be logged in to like posts");
      return;
    }

    try {
      const newLikesCount = liked ? likes - 1 : likes + 1;
      const newLikedState = !liked;
      
      // Optimistic UI update
      setLikes(newLikesCount);
      setLiked(newLikedState);
      
      if (newLikedState) {
        await likePost(post.id);
      } else {
        await unlikePost(post.id);
      }
      
      // Notify parent component about the updated likes count
      if (onPostUpdate) {
        onPostUpdate(post.id, { 
          ...post,
          likes: newLikesCount
        });
      }
    } catch (error) {
      // Revert optimistic update on error
      setLikes(liked ? likes : likes - 1);
      setLiked(liked);
      console.error("Error handling like:", error);
      toast.error(liked ? "Failed to unlike post" : "Failed to like post");
    }
  };

  const handleDelete = async () => {
    if (!user || user.uid !== post.userId) {
      toast.error("You can only delete your own posts");
      return;
    }
    
    try {
      await deletePost(post.id);
      toast.success("Post deleted successfully");
      if (onPostUpdate) {
        onPostUpdate(post.id, null);
      }
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post");
    }
  };

  const handleEdit = async () => {
    if (!user || user.uid !== post.userId) {
      toast.error("You can only edit your own posts");
      return;
    }

    if (isEditing) {
      try {
        const updatedPostData = {
          title: editedTitle,
          description: editedDescription,
          skills: editedSkills,
          githubLink: editedGithubLink
        };
        
        await updatePost(post.id, updatedPostData);
        
        // Update local state immediately
        const updatedPost = {
          ...post,
          ...updatedPostData
        };
        
        setPost(updatedPost);
        
        // Notify parent component about the update
        if (onPostUpdate) {
          onPostUpdate(post.id, updatedPostData);
        }

        setIsEditing(false);
        toast.success("Post updated successfully");
      } catch (error) {
        console.error("Error updating post:", error);
        toast.error("Failed to update post");
      }
    } else {
      setIsEditing(true);
    }
  };

  const formatDate = (date: any) => {
    try {
      if (!date) return "some time ago";
      
      // If date is a Firestore Timestamp, convert it to Date
      if (date && typeof date === 'object' && 'seconds' in date) {
        return formatDistanceToNow(new Date(date.seconds * 1000), { addSuffix: true });
      }
      
      // If date is an ISO string or valid date format
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return "some time ago";
      }
      
      return formatDistanceToNow(parsedDate, { addSuffix: true });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "some time ago";
    }
  };

  const highlightText = (text: string) => {
    if (!searchQuery || !text) return text;
    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === searchQuery?.toLowerCase() 
        ? <mark key={i} className="search-highlight">{part}</mark>
        : part
    );
  };

  const handleShare = (platform: string) => {
    const postUrl = `${window.location.origin}/post/${post.id}`;
    const text = `Check out this post: ${post.title}`;
    
    switch (platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + postUrl)}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(postUrl)}`, '_blank');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`, '_blank');
        break;
      case 'copy':
        navigator.clipboard.writeText(postUrl)
          .then(() => toast.success('Link copied to clipboard!'))
          .catch(() => toast.error('Failed to copy link'));
        break;
    }
    setShowShareOptions(false);
  };

  // Modified to close comments when share options are opened
  const toggleShareOptions = () => {
    // If opening share options, close comments
    if (!showShareOptions && isCommentsOpen && onCommentToggle) {
      onCommentToggle(post.id);
    }
    setShowShareOptions(!showShareOptions);
  };

  // Function to truncate and highlight text
  const renderDescription = () => {
    const maxLength = 250;
    const isLongText = post.description.length > maxLength;
    let displayText = post.description;
    
    if (isLongText && !expanded) {
      displayText = post.description.substring(0, maxLength).trim() + '...';
    }

    return (
      <>
        <p className="post-description">
          {searchQuery ? highlightText(displayText) : displayText}
        </p>
        {isLongText && (
          <button 
            className="read-more-btn" 
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>Read less <FaChevronUp /></>
            ) : (
              <>Read more <FaChevronDown /></>
            )}
          </button>
        )}
      </>
    );
  };

  // Add an effect to cleanup all event listeners and state when component unmounts
  useEffect(() => {
    return () => {
      // Reset all states to prevent memory leaks
      setShowShareOptions(false);
      setShowOptions(false);
      setIsEditing(false);
      setShowDeleteDialog(false);
    };
  }, []);

  return (
    <div className="post">
      <div className="post-header">
        <div className="post-info">
          <Link to={`/user/${post.username}`} className="username-link">
            <LetterAvatar name={post.username} size="small" />
            <div className="user-details">
              <span className="username">{highlightText(post.username)}</span>
              <span className="post-date">{formatDate(post.createdAt)}</span>
            </div>
          </Link>
        </div>
        {user?.uid === post.userId && (
          <div className="post-options">
            <button 
              className="options-button"
              onClick={() => setShowOptions(!showOptions)}
              ref={optionsButtonRef}
              aria-label="Post options"
            >
              <FaEllipsisV />
            </button>
            {showOptions && (
              <div className="options-dropdown" ref={optionsMenuRef}>
                <button onClick={() => {
                  handleEdit();
                  setShowOptions(false); // Close the menu when edit is clicked
                }}>
                  {isEditing ? <FaSave /> : <FaEdit />} {isEditing ? "Save" : "Edit"}
                </button>
                <button onClick={() => {
                  setShowDeleteDialog(true);
                  setShowOptions(false); // Close the menu when delete is clicked
                }}>
                  <FaTrash /> Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="post-content">
        {isEditing ? (
          <div className="edit-form">
            <div className="form-group">
              <label htmlFor={`title-${post.id}`}>Title</label>
              <input
                id={`title-${post.id}`}
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="edit-title"
                placeholder="Post title"
              />
            </div>
            <div className="form-group">
              <label htmlFor={`description-${post.id}`}>Description</label>
              <textarea
                id={`description-${post.id}`}
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                className="edit-description"
                placeholder="Post description"
              />
            </div>
            <div className="form-group">
              <label htmlFor={`skills-${post.id}`}>Skills (comma separated)</label>
              <input
                id={`skills-${post.id}`}
                type="text"
                value={editedSkills}
                onChange={(e) => setEditedSkills(e.target.value)}
                className="edit-skills"
                placeholder="React, Node.js, TypeScript"
              />
            </div>
            <div className="form-group">
              <label htmlFor={`github-${post.id}`}>
                <FaGithub /> GitHub Repository (Optional)
              </label>
              <input
                id={`github-${post.id}`}
                type="text"
                value={editedGithubLink}
                onChange={(e) => setEditedGithubLink(e.target.value)}
                className="edit-skills"
                placeholder="https://github.com/username/repository"
              />
            </div>
            <div className="edit-actions">
              <button 
                onClick={handleEdit}
                className="save-button"
              >
                <FaSave /> Save
              </button>
              <button 
                onClick={() => {
                  setIsEditing(false);
                  setEditedTitle(post.title);
                  setEditedDescription(post.description);
                  setEditedSkills(post.skills || '');
                  setEditedGithubLink(post.githubLink || '');
                }}
                className="cancel-button"
              >
                <FaTimes /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="post-title">
              {searchQuery ? highlightText(post.title) : post.title}
            </h2>
            {renderDescription()}
            {post.skills && (
              <div className="skills-container">
                <div className="skills-tags">
                  {post.skills.split(',').map((skill, index) => (
                    <span key={index} className="skill-tag">
                      {searchQuery 
                        ? highlightText(skill.trim().toUpperCase()) 
                        : skill.trim().toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {post.githubLink && (
          <div className="github-link-container">
            <a 
              href={post.githubLink} 
              target="_blank" 
              rel="noopener noreferrer"
              className="github-link"
            >
              <FaGithub /> View on GitHub
            </a>
          </div>
        )}
      </div>
      
      <div className="post-actions">
        <button 
          className={`action-button ${liked ? "liked" : ""}`}
          onClick={handleLike}
        >
          {liked ? <FaHeart /> : <FaRegHeart />} {likes}
        </button>
        <button 
          className="action-button"
          onClick={() => {
            // Close share options when opening comments
            if (showShareOptions) {
              setShowShareOptions(false);
            }
            if (onCommentToggle) onCommentToggle(post.id);
          }}
        >
          <FaComment /> {totalCommentCount}
        </button>
        <div className="share-container">
          <button 
            ref={shareButtonRef}
            className="action-button"
            onClick={toggleShareOptions}
          >
            <FaShare />
          </button>
          {showShareOptions && (
            <div ref={shareMenuRef} className="share-options">
              <button onClick={() => handleShare('whatsapp')}><FaWhatsapp /> WhatsApp</button>
              <button onClick={() => handleShare('twitter')}><FaTwitter /> Twitter</button>
              <button onClick={() => handleShare('facebook')}><FaFacebook /> Facebook</button>
              <button onClick={() => handleShare('copy')}><FaCopy /> Copy Link</button>
            </div>
          )}
        </div>
      </div>
      
      {isCommentsOpen && (
        <CommentSection 
          postId={post.id} 
          onCommentChanged={fetchLikesAndComments}
        />
      )}
      
      <ConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Post"
        message="Are you sure you want to delete this post? This action cannot be undone."
      />
    </div>
  );
}

export default Post;
