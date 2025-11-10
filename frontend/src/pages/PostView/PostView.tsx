/**
 * Post View Page
 * 
 * Displays a single post with full details and comments.
 * Used for deep-linking from notifications.
 */

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { API_BASE, authenticatedFetch } from '../../utils/auth';
import PostCard from '../../components/common/PostCard/PostCard';
import '../Feed/Feed.css';

interface PostViewProps {
  postId: string;
  highlightCommentId?: string;
  highlightReplyId?: string;
}

const PostView: React.FC<PostViewProps> = ({ postId, highlightCommentId, highlightReplyId }) => {
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
        <PostCard 
          post={post}
          autoOpenComments={true}
          highlightCommentId={highlightCommentId}
          highlightReplyId={highlightReplyId}
        />
      </div>
    </div>
  );
};

// Wrapper component that extracts route params
export const PostViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const commentId = searchParams.get('commentId') || undefined;
  const replyId = searchParams.get('replyId') || undefined;
  
  if (!id) return null;
  return <PostView postId={id} highlightCommentId={commentId} highlightReplyId={replyId} />;
};
