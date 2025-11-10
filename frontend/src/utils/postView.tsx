/**
 * Post View Utility Component
 * 
 * Displays a single post with PostCard component.
 * Used for deep-linking from notifications.
 */

import React, { useEffect, useState } from 'react';
import { API_BASE, authenticatedFetch } from './auth';
import PostCard from '../components/common/PostCard/PostCard';
import Comments from '../components/common/Social/Comments';
import '../pages/Feed/Feed.css';

interface PostViewProps {
  postId: string;
  highlightCommentId?: string;
  highlightReplyId?: string;
}

export const PostView: React.FC<PostViewProps> = ({ postId, highlightCommentId, highlightReplyId }) => {
  const [post, setPost] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true);
      try {
        const res = await authenticatedFetch(`${API_BASE}/api/feed/${postId}`);
        if (res.ok) {
          setPost(await res.json());
        }
      } finally {
        setLoading(false);
      }
    };
    if (postId) fetchPost();
  }, [postId]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <div className="spinner spinner--large"></div>
          <p>Loading post...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <h3>Post not found</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="posts-container">
        <PostCard post={post} />
      </div>
      <Comments 
        postId={post.id} 
        highlightCommentId={highlightCommentId}
        highlightReplyId={highlightReplyId}
      />
    </div>
  );
};

