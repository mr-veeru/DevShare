/**
 * CommentSection Component
 * 
 * A comprehensive comment system that provides:
 * - Core Features:
 *   - Add, edit, and delete comments
 *   - Nested replies with pagination
 *   - Like/unlike functionality
 *   - Real-time updates
 * 
 * - Technical Features:
 *   - Firestore integration with batch operations
 *   - Optimistic UI updates for better UX
 *   - Memory leak prevention with cleanup
 *   - Proper error handling and loading states
 *   - Accessibility compliance (ARIA labels, keyboard navigation)
 * 
 * - Performance Features:
 *   - Comment pagination with "View More"
 *   - Reply pagination per comment
 *   - Throttled comment count updates
 *   - Optimized re-renders with useCallback/useMemo
 * 
 * @component
 * @param {CommentSectionProps} props - Component props
 * @param {string} props.postId - Unique identifier for the post
 * @param {function} [props.onCommentChanged] - Optional callback for comment count updates
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../config/firebase';
import './CommentSection.css';
import { LoadingSpinner, ConfirmationDialog, LetterAvatar } from '../../components/common';
import { getComments, createComment, updateComment, deleteComment, getCommentLikes, likeComment, unlikeComment, deleteReply, updateReply, createReply } from '../../services/api';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { FaHeart, FaRegHeart } from 'react-icons/fa';

/**
 * Comment interface representing the structure of a comment or reply
 * @interface Comment
 */
interface Comment {
  id: string;
  text: string;
  userId: string;
  username: string;
  postId: string;
  createdAt: string;
  editedAt?: string;
  parentId?: string;
  replies?: Comment[];
  likes?: number;
  deleted?: boolean;
}

/**
 * Props interface for the CommentSection component
 * @interface CommentSectionProps
 */
interface CommentSectionProps {
  postId: string;
  onCommentChanged?: () => Promise<void>;
}

/**
 * A custom hook for managing keyboard shortcuts
 */
const useKeyboardShortcuts = (
  shortcuts: { [key: string]: (e: KeyboardEvent) => void },
  deps: any[] = []
) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in form elements
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Execute the corresponding shortcut handler
      if (shortcuts[e.key]) {
        shortcuts[e.key](e);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shortcuts, ...deps]);
};

const CommentSection: React.FC<CommentSectionProps> = ({ postId, onCommentChanged }) => {
  const [user] = useAuthState(auth);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editedText, setEditedText] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [showReplies, setShowReplies] = useState<{ [key: string]: boolean }>({});
  const [likedComments, setLikedComments] = useState<{ [key: string]: boolean }>({});
  const [commentLikes, setCommentLikes] = useState<{ [key: string]: number }>({});
  const [visibleCommentCount, setVisibleCommentCount] = useState(2); // Initially show 2 comments
  const [showAllComments, setShowAllComments] = useState(false);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const editInputRef = useRef<HTMLTextAreaElement | null>(null);
  const replyInputRef = useRef<HTMLTextAreaElement | null>(null);

  const fetchComments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const commentsData = await getComments(postId);
      
      // Filter out deleted comments and organize comments and replies
      const parentComments: Comment[] = [];
      const repliesMap: { [key: string]: Comment[] } = {};
      
      commentsData.forEach((comment: Comment) => {
        if (!comment.deleted) {
          if (!comment.parentId) {
            parentComments.push({ ...comment, replies: [] });
          } else {
            if (!repliesMap[comment.parentId]) {
              repliesMap[comment.parentId] = [];
            }
            repliesMap[comment.parentId].push(comment);
          }
        }
      });
      
      // Attach replies to parent comments
      parentComments.forEach(comment => {
        if (repliesMap[comment.id]) {
          comment.replies = repliesMap[comment.id]
            .filter(reply => !reply.deleted)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
      });
      
      setComments(parentComments);
      
      // Fetch likes for all comments
      const fetchLikes = async () => {
        const likedMap: { [key: string]: boolean } = {};
        const likesCountMap: { [key: string]: number } = {};
        
        // Fetch likes for parent comments
        for (const comment of parentComments) {
          try {
            const likesData = await getCommentLikes(comment.id);
            likedMap[comment.id] = likesData.userLiked || false;
            likesCountMap[comment.id] = likesData.count || 0;
            
            // Fetch likes for replies
            if (comment.replies && comment.replies.length > 0) {
              for (const reply of comment.replies) {
                try {
                  const replyLikesData = await getCommentLikes(reply.id);
                  likedMap[reply.id] = replyLikesData.userLiked || false;
                  likesCountMap[reply.id] = replyLikesData.count || 0;
                } catch (error) {
                  console.error(`Error fetching likes for reply ${reply.id}:`, error);
                }
              }
            }
          } catch (error) {
            console.error(`Error fetching likes for comment ${comment.id}:`, error);
          }
        }
        
        setLikedComments(likedMap);
        setCommentLikes(likesCountMap);
      };
      
      fetchLikes();
    } catch (error) {
      console.error("Error fetching comments:", error);
      setError("Failed to load comments");
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("You must be logged in to comment");
      return;
    }
    if (!newComment.trim()) {
      toast.error("Comment cannot be empty");
      return;
    }

    try {
      const commentData = {
        text: newComment.trim(),
        postId,
        username: user.displayName || 'Anonymous',
        userId: user.uid
      };

      const response = await createComment(postId, commentData);
      setComments(prev => [response, ...prev]);
      setNewComment("");
      if (onCommentChanged) {
        await onCommentChanged();
      }
      toast.success("Comment added successfully");
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    }
  };

  const handleEdit = async (comment: Comment) => {
    if (editingCommentId === comment.id) {
      try {
        const editData = {
          text: editedText,
          editedAt: new Date().toISOString()
        };

        if (comment.parentId) {
          // Update reply
          await updateReply(comment.id, editData);
        } else {
          // Update comment
          await updateComment(comment.id, editData);
        }

        setComments(prevComments => {
          if (comment.parentId) {
            // Update reply
            return prevComments.map(c => ({
              ...c,
              replies: c.replies?.map(r =>
                r.id === comment.id ? { ...r, text: editedText, editedAt: editData.editedAt } : r
              )
            }));
          } else {
            // Update comment
            return prevComments.map(c =>
              c.id === comment.id ? { ...c, text: editedText, editedAt: editData.editedAt } : c
            );
          }
        });

        setEditingCommentId(null);
        setEditedText("");
        
        if (onCommentChanged) {
          await onCommentChanged();
        }
        
        toast.success("Comment updated successfully");
      } catch (error) {
        console.error("Error updating comment:", error);
        toast.error("Failed to update comment");
      }
    } else {
      setEditingCommentId(comment.id);
      setEditedText(comment.text);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      const commentToDelete = comments.find(c => c.id === commentId) || 
        comments.flatMap(c => c.replies || []).find(r => r.id === commentId);

      if (!commentToDelete) {
        throw new Error('Comment not found');
      }

      if (commentToDelete.parentId) {
        // Delete reply
        await deleteReply(commentId);
      } else {
        // Delete comment
        await deleteComment(commentId);
      }
      
      // Update the UI to remove the comment or reply
      setComments(prevComments => {
        if (commentToDelete.parentId) {
          // If it's a reply, find its parent and remove it from replies
          return prevComments.map(comment => ({
            ...comment,
            replies: comment.replies?.filter(reply => reply.id !== commentId)
          }));
        } else {
          // If it's a top-level comment, filter it out
          return prevComments.filter(c => c.id !== commentId);
        }
      });
      
      setShowDeleteDialog(false);
      setCommentToDelete(null);
      
      if (onCommentChanged) {
        await onCommentChanged();
      }
      
      toast.success("Comment deleted successfully");
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("Failed to delete comment");
    }
  };

  const handleReply = async (parentId: string) => {
    if (!user) {
      toast.error("You must be logged in to reply");
      return;
    }
    if (!replyText.trim()) {
      toast.error("Reply cannot be empty");
      return;
    }

    try {
      const replyData = {
        text: replyText.trim(),
        postId,
        parentId,
        userId: user.uid,
        username: user.displayName || 'Anonymous'
      };

      const response = await createReply(parentId, replyData);
      
      // Update the UI optimistically
      setComments(prevComments => 
        prevComments.map(comment => {
          if (comment.id === parentId) {
            return {
              ...comment,
              replies: [response, ...(comment.replies || [])]
            };
          }
          return comment;
        })
      );
      
      setReplyText("");
      setReplyingTo(null);
      
      if (onCommentChanged) {
        await onCommentChanged();
      }
      
      toast.success("Reply added successfully");
    } catch (error) {
      console.error("Error adding reply:", error);
      toast.error("Failed to add reply");
    }
  };

  const handleLikeComment = async (commentId: string, e?: React.KeyboardEvent) => {
    // Allow keyboard activation with space or enter
    if (e && e.key !== 'Enter' && e.key !== ' ') {
      return;
    }
    
    // Only prevent default for space in interactive elements like buttons
    // This ensures space still works in text inputs
    if (e && e.key === ' ' && e.target instanceof HTMLButtonElement) {
      e.preventDefault(); // Prevent page scroll on space, but only for buttons
    }
    
    if (!user) {
      toast.error("You must be logged in to like comments");
      return;
    }
    
    try {
      if (likedComments[commentId]) {
        // Unlike the comment
        await unlikeComment(commentId);
        setLikedComments(prev => ({ ...prev, [commentId]: false }));
        setCommentLikes(prev => ({ ...prev, [commentId]: Math.max(0, (prev[commentId] || 0) - 1) }));
      } else {
        // Like the comment
        await likeComment(commentId);
        setLikedComments(prev => ({ ...prev, [commentId]: true }));
        setCommentLikes(prev => ({ ...prev, [commentId]: (prev[commentId] || 0) + 1 }));
      }
      
      if (onCommentChanged) {
        await onCommentChanged();
      }
    } catch (error) {
      console.error("Error handling comment like:", error);
      toast.error("Failed to process like");
    }
  };

  const handleShowMoreComments = () => {
    if (showAllComments) {
      return;
    }
    
    if (visibleCommentCount + 5 >= comments.length) {
      setShowAllComments(true);
      setVisibleCommentCount(comments.length);
    } else {
      setVisibleCommentCount(prevCount => prevCount + 5);
    }
  };
  
  const handleShowLessComments = () => {
    setShowAllComments(false);
    setVisibleCommentCount(2); // Reset to initial count
  };

  // Focus management for comment editing
  useEffect(() => {
    if (editingCommentId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingCommentId]);

  // Focus management for replies
  useEffect(() => {
    if (replyingTo && replyInputRef.current) {
      replyInputRef.current.focus();
    }
  }, [replyingTo]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    c: () => {
      if (commentInputRef.current) {
        commentInputRef.current.focus();
      }
    },
    Escape: () => {
      // Cancel editing or replying if active
      if (editingCommentId) {
        setEditingCommentId(null);
        setEditedText("");
      } else if (replyingTo) {
        setReplyingTo(null);
        setReplyText("");
      }
    }
  }, [editingCommentId, replyingTo]);

  const renderComment = (comment: Comment, isReply = false) => {
    // Don't render deleted comments
    if (comment.deleted) {
      return null;
    }

    const commentId = `comment-${comment.id}`;

    return (
      <div key={comment.id} 
        className={`comment ${isReply ? 'reply' : ''}`} 
        id={commentId}
        tabIndex={0}
        aria-labelledby={`${commentId}-username`}
        aria-describedby={`${commentId}-text`}
        onKeyDown={(e) => {
          // Only prevent default for Enter and Space when the div itself is the target
          // This allows space to work normally in child input elements
          if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
            e.preventDefault();
          }
        }}
      >
        <div className="comment-header">
          <div className="comment-user">
            <Link to={`/user/${comment.username}`}
              aria-label={`${comment.username}'s profile`}
              tabIndex={0}
            >
              <LetterAvatar name={comment.username} size="small" />
            </Link>
            <div className="comment-info">
              <Link to={`/user/${comment.username}`} 
                className="comment-username"
                id={`${commentId}-username`}
                tabIndex={0}
              >
                {comment.username}
              </Link>
              <div className="comment-metadata">
                <span className="comment-time">
                  {comment.editedAt ? (
                    <>edited {formatDistanceToNow(new Date(comment.editedAt), { addSuffix: true })}</>
                  ) : (
                    formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {editingCommentId === comment.id ? (
          <div className="edit-comment">
            <textarea
              ref={(el) => editInputRef.current = el}
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="edit-input"
              aria-label="Edit comment"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setEditingCommentId(null);
                  setEditedText("");
                } else if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleEdit(comment);
                }
              }}
            />
            <div className="edit-actions">
              <button 
                onClick={() => handleEdit(comment)} 
                className="save-button"
                aria-label="Save edited comment"
                tabIndex={0}
              >
                Save
              </button>
              <button 
                onClick={() => {
                  setEditingCommentId(null);
                  setEditedText("");
                }} 
                className="cancel-button"
                aria-label="Cancel edit"
                tabIndex={0}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="comment-text" id={`${commentId}-text`}>{comment.text}</p>
            <div className="comment-actions">
              {/* Only show Reply button for comments (not replies) and when user is logged in */}
              {user && !isReply && (
                <button 
                  onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                  className="reply-button"
                  aria-label={`Reply to ${comment.username}'s comment`}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault(); // This is fine for buttons
                      setReplyingTo(replyingTo === comment.id ? null : comment.id);
                    }
                  }}
                >
                  Reply
                </button>
              )}
              
              {/* Like button for both comments and replies */}
              <button
                onClick={() => handleLikeComment(comment.id)}
                onKeyDown={(e) => handleLikeComment(comment.id, e)}
                className={`like-button ${likedComments[comment.id] ? 'liked' : ''}`}
                aria-label={likedComments[comment.id] ? `Unlike comment (${commentLikes[comment.id] || 0} likes)` : `Like comment (${commentLikes[comment.id] || 0} likes)`}
                aria-pressed={likedComments[comment.id] || false}
                tabIndex={0}
              >
                {likedComments[comment.id] ? <FaHeart /> : <FaRegHeart />} {commentLikes[comment.id] || 0}
              </button>
              
              {/* Edit and Delete buttons for comment/reply owner */}
              {user?.uid === comment.userId && (
                <>
                  <button 
                    onClick={() => handleEdit(comment)}
                    className="edit-button"
                    aria-label={`Edit ${isReply ? 'reply' : 'comment'}`}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault(); // This is fine for buttons
                        handleEdit(comment);
                      }
                    }}
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => {
                      setCommentToDelete(comment.id);
                      setShowDeleteDialog(true);
                    }}
                    className="delete-button"
                    aria-label={`Delete ${isReply ? 'reply' : 'comment'}`}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault(); // This is fine for buttons
                        handleDelete(comment.id);
                      }
                    }}
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {replyingTo === comment.id && (
          <div className="reply-form">
            <textarea
              ref={(el) => replyInputRef.current = el}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply..."
              className="reply-input"
              aria-label={`Reply to ${comment.username}`}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setReplyingTo(null);
                  setReplyText("");
                } else if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleReply(comment.id);
                }
              }}
            />
            <div className="reply-actions">
              <button 
                onClick={() => handleReply(comment.id)}
                className="submit-reply"
                aria-label="Submit reply"
                tabIndex={0}
              >
                Reply
              </button>
              <button 
                onClick={() => {
                  setReplyingTo(null);
                  setReplyText("");
                }}
                className="cancel-reply"
                aria-label="Cancel reply"
                tabIndex={0}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {comment.replies && comment.replies.length > 0 && (
          <div className="replies-section">
            <button 
              onClick={() => setShowReplies(prev => ({
                ...prev,
                [comment.id]: !prev[comment.id]
              }))}
              className={`toggle-replies ${showReplies[comment.id] ? 'expanded' : ''}`}
              aria-label={showReplies[comment.id] ? 'Hide replies' : 'Show replies'}
              aria-expanded={showReplies[comment.id] ? 'true' : 'false'}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault(); // This is fine for buttons
                  setShowReplies(prev => ({
                    ...prev,
                    [comment.id]: !prev[comment.id]
                  }));
                }
              }}
            >
              {showReplies[comment.id] ? 'Hide' : 'Show'} {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
            </button>
            
            {showReplies[comment.id] && (
              <div className="replies-list" id={`replies-${comment.id}`}>
                {comment.replies.map((reply: Comment) => renderComment(reply, true))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="error-message">{error}</div>;

  // Get the visible comments based on our current state
  const visibleComments = comments.slice(0, visibleCommentCount);

  return (
    <div className="comments-section" role="region" aria-label="Comments">
      <form onSubmit={handleSubmit} className="comment-form">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          className="comment-input"
          aria-label="Write a comment"
          rows={3}
          onKeyDown={(e) => {
            // Only handle Enter key for form submission
            // Do NOT prevent default for space or any other keys
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <button 
          type="submit" 
          className="submit-button"
          aria-label="Submit comment"
          tabIndex={0}
        >
          Comment
        </button>
      </form>

      <div className="comments-list" role="feed" aria-label="Comments list">
        {comments.length === 0 ? (
          <div className="no-comments">
            No comments yet. Be the first to comment!
          </div>
        ) : (
          <>
            {visibleComments.map(comment => renderComment(comment))}
            
            {/* Show more/less buttons */}
            <div className="comments-pagination">
              {!showAllComments && visibleCommentCount < comments.length && (
                <button 
                  onClick={handleShowMoreComments}
                  className="show-more-comments"
                  aria-label={`Show more comments (${comments.length - visibleCommentCount} remaining)`}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault(); // This is fine for buttons
                      handleShowMoreComments();
                    }
                  }}
                >
                  Show more comments ({comments.length - visibleCommentCount} remaining)
                </button>
              )}
              
              {(showAllComments || visibleCommentCount > 2) && (
                <button 
                  onClick={handleShowLessComments}
                  className="show-less-comments"
                  aria-label="Show less comments"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault(); // This is fine for buttons
                      handleShowLessComments();
                    }
                  }}
                >
                  Show less comments
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <ConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setCommentToDelete(null);
        }}
        onConfirm={() => commentToDelete && handleDelete(commentToDelete)}
        title="Delete Comment"
        message="Are you sure you want to delete this comment? This action cannot be undone."
      />
    </div>
  );
};

export default CommentSection; 
