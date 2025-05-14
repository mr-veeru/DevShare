/**
 * @fileoverview Single Post Page Component
 * Displays a single post with comments, typically navigated to from notifications
 * or when sharing a direct link to a post.
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import Post from '../feed/Post';
import { PostItem } from '../feed/Feed';
import { LoadingSpinner } from '../../components/common';
import { FaArrowLeft, FaExclamationCircle } from 'react-icons/fa';
import './SinglePost.css';

/**
 * SinglePost Component
 * Displays a single post based on the postId URL parameter
 */
const SinglePost: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const [post, setPost] = useState<PostItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(true); // Comments section open by default
  const navigate = useNavigate();
  
  // Fetch the post data
  useEffect(() => {
    const fetchPost = async () => {
      if (!postId) {
        setError('Post ID is missing');
        setLoading(false);
        return;
      }
      
      try {
        const postDoc = await getDoc(doc(db, 'posts', postId));
        
        if (postDoc.exists()) {
          setPost({
            id: postDoc.id,
            ...postDoc.data(),
          } as PostItem);
        } else {
          setError('Post not found');
        }
      } catch (err) {
        console.error('Error fetching post:', err);
        setError('Error loading post. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPost();
  }, [postId]);
  
  // Toggle comments visibility
  const handleCommentToggle = () => {
    setCommentsOpen(!commentsOpen);
  };
  
  // Handle navigation back to feed
  const handleBack = () => {
    navigate(-1);
  };
  
  if (loading) {
    return <LoadingSpinner text="Loading post..." />;
  }
  
  return (
    <div className="single-post-page">
      <div className="single-post-header">
        <button className="back-button" onClick={handleBack}>
          <FaArrowLeft /> Back
        </button>
        <h1>Post</h1>
      </div>
      
      {error ? (
        <div className="post-error">
          <FaExclamationCircle className="error-icon" />
          <h2>Error</h2>
          <p>{error}</p>
          <button className="back-to-feed-btn" onClick={() => navigate('/feed')}>
            Back to Feed
          </button>
        </div>
      ) : post ? (
        <div className="single-post-container">
          <Post 
            post={post} 
            isCommentsOpen={commentsOpen}
            onCommentToggle={() => handleCommentToggle()}
          />
        </div>
      ) : (
        <div className="post-not-found">
          <h2>Post Not Found</h2>
          <p>The post you're looking for may have been removed or doesn't exist.</p>
          <button className="back-to-feed-btn" onClick={() => navigate('/feed')}>
            Back to Feed
          </button>
        </div>
      )}
    </div>
  );
};

export default SinglePost; 