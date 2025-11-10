/**
 * Comments Section Component
 * 
 * Displays comments for a post with reply functionality.
 * Supports comment creation, editing, deletion, and nested replies.
 * Includes like functionality and pagination for large comment lists.
 */

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { formatRelative, formatDisplayDate } from '../../../utils/date';
import '../common.css';
import './Likes.css';
import { FaHeart, FaRegHeart } from 'react-icons/fa';
import { API_BASE, authenticatedFetch, refreshNotificationCount } from '../../../utils/auth';
import LetterAvatar from '../LetterAvatar/LetterAvatar';
import './Comments.css';
import Reply from './Reply';
import { Comment, Like} from '../../../types';
import { useToast } from '../Toast/Toast';
import ConfirmModal from '../ConfirmModal/ConfirmModal';

interface CommentsProps {
  postId: string;
  currentUserId?: string;
  onCountsChange?: (newCount: number) => void;
  highlightCommentId?: string;
  highlightReplyId?: string;
}

const Comments: React.FC<CommentsProps> = ({ postId, currentUserId, onCountsChange, highlightCommentId, highlightReplyId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [showReplyBox, setShowReplyBox] = useState<Record<string, boolean>>({});
  const [likesModalOpen, setLikesModalOpen] = useState(false);
  const [likesModalLoading, setLikesModalLoading] = useState(false);
  const [likesModalList, setLikesModalList] = useState<Like[]>([]);
  const [showAllComments, setShowAllComments] = useState(false);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);
  const replyInputRefs = useRef<Record<string, HTMLTextAreaElement>>({});
  const { showSuccess, showError } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTargetCommentId, setConfirmTargetCommentId] = useState<string | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate total comment count including replies
  const totalCount = useMemo(() => {
    return comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0);
  }, [comments]);

  // Notify parent component when comment count changes
  useEffect(() => {
    onCountsChange?.(totalCount);
  }, [totalCount, onCountsChange]);

  // Fetch all comments for this post
  const fetchComments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authenticatedFetch(`${API_BASE}/api/social/comments/posts/${postId}/comments`);
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || 'Failed to load comments');
      }
      const data = await res.json();
      setComments(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message || 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  // After comments load, optionally highlight and scroll to a specific comment/reply
  useEffect(() => {
    if (!comments || comments.length === 0) return;
    if (highlightCommentId) {
      const el = containerRef.current?.querySelector(`[data-comment-id="${highlightCommentId}"]`) as HTMLElement | null;
      if (el) {
        el.classList.add('highlight');
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setExpandedIds((prev) => ({ ...prev, [highlightCommentId]: true }));
        setTimeout(() => el.classList.remove('highlight'), 2500);
      }
    } else if (highlightReplyId) {
      // Find the comment containing this reply, expand it, and scroll
      const parent = containerRef.current?.querySelector(`[data-reply-id="${highlightReplyId}"]`) as HTMLElement | null;
      if (parent) {
        // Expand all comments first (cheap fallback)
        setExpandedIds((prev) => {
          const next = { ...prev } as Record<string, boolean>;
          comments.forEach(c => { next[c.id] = true; });
          return next;
        });
        parent.classList.add('highlight');
        parent.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => parent.classList.remove('highlight'), 2500);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comments, highlightCommentId, highlightReplyId]);

  // Add new comment to the post
  const handleAddComment = async () => {
    const trimmed = content.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      const res = await authenticatedFetch(`${API_BASE}/api/social/comments/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed })
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || 'Failed to add comment');
      }
      const newComment: Comment = await res.json();
      setComments(prev => [newComment, ...prev]);
      setContent('');
      // Refresh notification count from backend to ensure accuracy
      // (Notification is created for post owner, not the commenter)
      refreshNotificationCount();
    } catch (e: any) {
      setError(e.message || 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  // Check if current user owns this comment (can edit/delete)
  const canEditOrDelete = (comment: Comment) => currentUserId && comment.user?.id === currentUserId;

  // Pagination: Show first 2 comments, then "show more" option
  const displayedComments = showAllComments ? comments : comments.slice(0, 2);
  const remainingCommentsCount = comments.length - 2;

  // Enter edit mode for a comment
  const beginEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditValue(comment.content);
    // Auto-focus edit textarea after state update
    setTimeout(() => {
      editInputRef.current?.focus();
    }, 0);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  // Save edited comment content
  const saveEdit = async (commentId: string) => {
    const payload = editValue.trim();
    if (!payload) return;
    try {
      const res = await authenticatedFetch(`${API_BASE}/api/social/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: payload })
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || 'Failed to update comment');
      }
      const updated: Comment = await res.json();
      setComments(prev => prev.map(c => (c.id === commentId ? updated : c)));
      setEditingId(null);
      setEditValue('');
    } catch (e: any) {
      setError(e.message || 'Failed to update comment');
    }
  };

  const handleAddReply = async (commentId: string) => {
    const text = (replyDrafts[commentId] || '').trim();
    if (!text) return;
    try {
      const res = await authenticatedFetch(`${API_BASE}/api/social/replies/comments/${commentId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text })
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || 'Failed to add reply');
      }
      const newReply = await res.json();
      setComments(prev => prev.map(c => c.id === commentId ? {
        ...c,
        replies: [newReply, ...(c.replies || [])],
        replies_count: (c.replies_count || 0) + 1
      } : c));
      setExpandedIds(prev => ({ ...prev, [commentId]: true }));
      setReplyDrafts(prev => ({ ...prev, [commentId]: '' }));
      setShowReplyBox(prev => ({ ...prev, [commentId]: false }));
      // Refresh notification count from backend to ensure accuracy
      // (Notification is created for comment owner, not the replier)
      refreshNotificationCount();
    } catch (e: any) {
      setError(e.message || 'Failed to add reply');
    }
  };

  const handleDelete = async (commentId: string) => {
    setConfirmTargetCommentId(commentId);
    setConfirmOpen(true);
  };

  const deleteCommentInner = async (commentId: string) => {
    try {
      const res = await authenticatedFetch(`${API_BASE}/api/social/comments/${commentId}`, { method: 'DELETE' });
      const result = await res.json().catch(() => ({}));
      if (res.ok || res.status === 200) {
        setComments(prev => prev.filter(c => c.id !== commentId));
        showSuccess(result.message || 'Comment deleted successfully!');
      } else {
        throw new Error(result.message || 'Failed to delete comment');
      }
    } catch (e: any) {
      const errorMsg = e.message || 'Failed to delete comment';
      showError(errorMsg);
      setError(errorMsg);
    }
  };

  return (
    <div className="comments-section" ref={containerRef}>
      {/* Input */}
      <div className="comment-input">
        <textarea
          ref={commentInputRef}
          placeholder="Write a comment..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={submitting}
          autoFocus
        />
        <button className="btn-primary comment-submit" onClick={handleAddComment} disabled={submitting || !content.trim()}>
          Comment
        </button>
      </div>

      {/* Error */}
      {error && <div className="comment-error">{error}</div>}

      {/* Comments list */}
      <div className="comments-list">
        {loading ? (
          <div className="comments-loading"><div className="spinner spinner--small"></div></div>
        ) : (
          displayedComments.map((c) => (
            <div key={c.id} className="comment-item" data-comment-id={c.id}>
              <div className="comment-header">
                <div className="comment-user">
                  <LetterAvatar name={c.user?.username || 'User'} size="small" />
                  <div className="comment-meta">
                    <div className="comment-username">{c.user?.username}</div>
                    <div className="comment-time">{formatRelative(c.created_at)}</div>
                  </div>
                </div>
                <div className="comment-actions">
                  {/* Like comment */}
                  <button
                    className={`comment-action ${c.liked ? 'liked' : ''}`}
                    onClick={async () => {
                      try {
                        const res = await authenticatedFetch(`${API_BASE}/api/social/comments/${c.id}/likes`, { method: 'POST' });
                        if (res.ok) {
                          const data = await res.json();
                          setComments(prev => prev.map(x => x.id === c.id ? { ...x, likes_count: Number(data.likes_count) || 0, liked: Boolean(data.liked) } : x));
                          // Refresh notification count from backend to ensure accuracy
                          // (Notification is created for comment owner, not the liker)
                          refreshNotificationCount();
                        }
                      } catch {}
                    }}
                  >
                    {c.liked ? <FaHeart className="action-icon" /> : <FaRegHeart className="action-icon" />}
                  </button>
                  <button
                    className="comment-action likes-count-btn"
                    title="View who liked this comment"
                    disabled={!c.likes_count}
                    onClick={async () => {
                      if (!c.likes_count) return;
                      setLikesModalOpen(true);
                      setLikesModalLoading(true);
                      try {
                        const res = await authenticatedFetch(`${API_BASE}/api/social/comments/${c.id}/likes`);
                        if (res.ok) setLikesModalList(await res.json());
                      } finally {
                        setLikesModalLoading(false);
                      }
                    }}
                  >
                    {c.likes_count || 0}
                  </button>

                  {canEditOrDelete(c) && (
                    <>
                      {editingId === c.id ? (
                        <>
                          <button className="comment-action" onClick={() => saveEdit(c.id)}>Save</button>
                          <button className="comment-action" onClick={cancelEdit}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button className="comment-action" onClick={() => beginEdit(c)}>Edit</button>
                          <button className="comment-action" onClick={() => handleDelete(c.id)}>Delete</button>
                        </>
                      )}
                    </>
                  )}

                  <button className="comment-action" onClick={() => {
                    setShowReplyBox(prev => ({ ...prev, [c.id]: !prev[c.id] }));
                    // Auto-focus reply textarea after state update
                    setTimeout(() => {
                      replyInputRefs.current[c.id]?.focus();
                    }, 0);
                  }}>Reply</button>
                </div>
              </div>
              {editingId === c.id ? (
                <div className="comment-edit">
                  <textarea
                    ref={editInputRef}
                    className="comment-edit-input"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                  />
                </div>
              ) : (
                <div className="comment-content">{c.content}</div>
              )}

              {/* Add reply input */}
              {showReplyBox[c.id] && (
                <div className="reply-input">
                  <textarea
                    ref={(el) => { if (el) replyInputRefs.current[c.id] = el; }}
                    placeholder="Write a reply..."
                    value={replyDrafts[c.id] || ''}
                    onChange={(e) => setReplyDrafts(prev => ({ ...prev, [c.id]: e.target.value }))}
                  />
                  <button className="btn-primary comment-submit" onClick={() => handleAddReply(c.id)} disabled={!((replyDrafts[c.id] || '').trim())}>Reply</button>
                </div>
              )}

              {/* Reply toggle */}
              {Array.isArray(c.replies) && c.replies.length > 0 && (
                <button
                  className="replies-toggle"
                  onClick={() => setExpandedIds(prev => ({ ...prev, [c.id]: !prev[c.id] }))}
                >
                  {expandedIds[c.id] ? `Hide ${c.replies.length} replies` : `Show ${c.replies.length} replies`}
                </button>
              )}

              {/* Replies */}
               {expandedIds[c.id] && Array.isArray(c.replies) && c.replies.length > 0 && (
                 <div className="replies-list">
                   {c.replies.map((r) => (
                     <div key={r.id} data-reply-id={r.id}>
                     <Reply
                       reply={r}
                       currentUserId={currentUserId}
                       onUpdated={(updated) => setComments(prev => prev.map(x => x.id === c.id ? { ...x, replies: (x.replies || []).map(rr => rr.id === updated.id ? updated : rr) } : x))}
                       onDeleted={(rid) => setComments(prev => prev.map(x => x.id === c.id ? { ...x, replies: (x.replies || []).filter(rr => rr.id !== rid), replies_count: Math.max(0, (x.replies_count || 0) - 1) } : x))}
                     />
                     </div>
                   ))}
                 </div>
               )}
            </div>
          ))
        )}
      </div>

      {/* Show remaining comments button */}
      {!loading && comments.length > 2 && (
        <div className="pagination">
          <button
            className="view-remaining-btn"
            onClick={() => setShowAllComments(!showAllComments)}
          >
            {showAllComments 
              ? 'Show less comments' 
              : `View remaining ${remainingCommentsCount} comments`
            }
          </button>
        </div>
      )}
      {likesModalOpen && (
        <div className="likes-modal-overlay" onClick={() => setLikesModalOpen(false)}>
          <div className="likes-modal" onClick={(e) => e.stopPropagation()}>
            <div className="likes-modal-header">
              <h3>Comment Likes</h3>
              <button className="close-btn" onClick={() => setLikesModalOpen(false)}>×</button>
            </div>
            <div className="likes-modal-content">
              {likesModalLoading ? (
                <div className="loading-spinner">Loading...</div>
              ) : (
                <div className="likes-list">
                  {likesModalList.map((like) => (
                    <div key={like.id} className="like-item">
                      <div className="like-user-info">
                        <div className="like-username">{like.user.username}</div>
                        <div className="like-email">{like.user.email}</div>
                      </div>
                      <div className="like-date">{formatDisplayDate(like.created_at)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <ConfirmModal
        open={confirmOpen}
        title="Delete comment"
        description="Are you sure you want to delete this comment?"
        confirmLabel="Delete"
        loading={confirmBusy}
        onClose={() => setConfirmOpen(false)}
        onConfirm={async () => {
          if (!confirmTargetCommentId || confirmBusy) return;
          setConfirmBusy(true);
          try {
            await deleteCommentInner(confirmTargetCommentId);
            setConfirmOpen(false);
          } finally {
            setConfirmBusy(false);
          }
        }}
      />
    </div>
  );
};

export default Comments;
