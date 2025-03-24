/**
 * @fileoverview Profile Component
 * Handles user profile display and management, including:
 * - User information and statistics
 * - Project posts display and management
 * - Skills overview
 * - Activity tracking
 * Features CRUD operations for posts and comprehensive error handling.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../config/firebase';
import { useNavigate, useParams } from 'react-router-dom';
import { FaProjectDiagram, FaCalendarAlt, FaClock, FaGithub, FaCode, FaPlus, FaChartLine, FaTrophy } from 'react-icons/fa';
import './Profile.css';
import { LoadingSpinner, Message, useAutoMessage, LetterAvatar } from '../../components/common';
import Post from '../feed/Post';
import { getPosts, getLikes } from '../../services/api';

/**
 * Interface for user statistics
 */
interface UserStats {
  totalLikes: number;
  joinedDate: Date;
  skillsUsed: Set<string>;
  lastActive: Date;
}

interface UserPost {
  id: string;
  title: string;
  description: string;
  username: string;
  userId: string;
  createdAt: any;
  skills?: string;
  githubLink?: string;
  likes?: number;
}

/**
 * Profile Component
 * Main profile page displaying user information and posts
 */
const Profile = () => {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const { username } = useParams();
  const [isOwnProfile, setIsOwnProfile] = useState(true);
  
  // Add state for managing comments
  const [openComments, setOpenComments] = useState<string | null>(null);
  
  // User stats state
  const [userStats, setUserStats] = useState<UserStats>({
    totalLikes: 0,
    joinedDate: new Date(),
    skillsUsed: new Set<string>(),
    lastActive: new Date(),
  });
  
  // Posts state
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { message, clearMessage } = useAutoMessage();

  // Move fetchUserPosts before the useEffect that uses it
  const fetchUserPosts = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const allPosts = await getPosts();
      const userPosts = allPosts.filter((post: UserPost) => 
        post.username === (username || user.displayName)
      );
      
      // Get likes for each post
      const postsWithLikes = await Promise.all(userPosts.map(async (post: UserPost) => {
        const likesData = await getLikes(post.id);
        // Check if likesData has the expected format with count property
        let likesCount = 0;
        
        if (likesData && typeof likesData.count === 'number') {
          likesCount = likesData.count;
        } else if (Array.isArray(likesData)) {
          likesCount = likesData.length;
        }
        
        console.log(`Post "${post.title}" has ${likesCount} likes from API`);
        return { ...post, likes: likesCount };
      }));

      console.log('Posts with likes:', postsWithLikes);
      setPosts(postsWithLikes);
    } catch (error) {
      console.error("Error fetching posts:", error);
      setError("Failed to load posts");
    } finally {
      setLoading(false);
    }
  }, [user, username]);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    // Set isOwnProfile based on username
    setIsOwnProfile(!username || username === user.displayName);
    fetchUserPosts();
  }, [user, navigate, fetchUserPosts, username]);

  // Calculate user statistics
  const calculateUserStats = useCallback(() => {
    try {
      // Calculate unique skills
      const skills = new Set<string>();
      // Calculate total likes
      let totalLikes = 0;
      
      posts.forEach(post => {
        if (post.skills) {
          post.skills.split(',').forEach((skill: string) => skills.add(skill.trim()));
        }
        // Add post likes to total
        if (post.likes) {
          console.log(`Post "${post.title}" has ${post.likes} likes`);
          totalLikes += post.likes;
        }
      });

      console.log(`Total calculated likes: ${totalLikes}`);
      
      return {
        totalPosts: posts.length,
        uniqueSkills: Array.from(skills),
        totalLikes: totalLikes,
        githubProjects: posts.filter(post => post.githubLink).length,
      };
    } catch (error) {
      console.error("Error calculating user stats:", error);
      return {
        totalPosts: 0,
        uniqueSkills: [],
        totalLikes: 0,
        githubProjects: 0,
      };
    }
  }, [posts]);

  useEffect(() => {
    const stats = calculateUserStats();
    console.log('Setting user stats with total likes:', stats.totalLikes);
    setUserStats(prev => ({
      ...prev,
      totalLikes: stats.totalLikes,
      skillsUsed: new Set(stats.uniqueSkills),
    }));
  }, [calculateUserStats]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const sortPostsByDate = (posts: UserPost[]) => {
    return [...posts].sort((a, b) => {
      return b.createdAt - a.createdAt;
    });
  };

  // Add comment toggle handler
  const handleCommentToggle = (postId: string) => {
    setOpenComments(prev => prev === postId ? null : postId);
  };

  // Add handler for post updates
  const handlePostUpdate = useCallback((postId: string, updatedData: Partial<any>) => {
    // If the post was deleted (updatedData is null)
    if (!updatedData) {
      setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
      return;
    }
    
    // Update the post in the posts array
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === postId 
          ? { ...post, ...updatedData }
          : post
      )
    );
    
    // Log the update for debugging
    console.log(`Post ${postId} updated with:`, updatedData);
    if (updatedData.likes !== undefined) {
      console.log(`Likes updated to: ${updatedData.likes}`);
    }
  }, []);

  if (loading) {
    return <LoadingSpinner text="Loading profile..." />;
  }

  if (error) {
    return (
      <div className="profile-page">
        <div className="profile-container">
          <div className="error-message">
            <h2>Error Loading Posts</h2>
            <p>{error}</p>
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/feed')}
            >
              Return to Feed
            </button>
          </div>
        </div>
      </div>
    );
  }

  const stats = calculateUserStats();

  return (
    <div className="profile-page">
      <div className="messages-container">
        {message.text && (
          <Message 
            type={message.type as 'success' | 'error'} 
            message={message.text} 
            onClose={clearMessage}
          />
        )}
      </div>
      
      <div className="profile-container">
        <div className="profile-header">
          <div className="profile-left-column">
            <LetterAvatar 
              name={username || user?.displayName || 'User'} 
              size="large"
              className="profile-avatar"
            />
            
            <div className="profile-user-info">
              <h2 className="profile-name">{username || user?.displayName || 'User'}</h2>
              {isOwnProfile && <p className="profile-email">{user?.email || 'No email'}</p>}
            </div>
            
            {isOwnProfile && (
              <button 
                className="edit-profile-btn"
                onClick={() => navigate('/settings/profile')}
              >
                Edit Profile Settings
              </button>
            )}
          </div>
          
          {/* Right Column: Stats and Meta Info */}
          <div className="profile-right-column">
            {/* Stats */}
            <div className="profile-stats">
              <div className="stat-item">
                <span className="stat-value">{stats.totalPosts}</span>
                <span className="stat-label">Projects</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{userStats.skillsUsed.size}</span>
                <span className="stat-label">Skills</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{stats.totalLikes}</span>
                <span className="stat-label">Total Likes</span>
              </div>
            </div>
            
            {/* Meta Info (Joined Date, Last Active) */}
            <div className="profile-meta">
              <div className="meta-item">
                <FaCalendarAlt className="meta-icon" />
                <span>Joined {formatDate(userStats.joinedDate)}</span>
              </div>
              <div className="meta-item">
                <FaClock className="meta-icon" />
                <span>Last active {formatDate(userStats.lastActive)}</span>
              </div>
            </div>
          </div>
        </div>
        
        <section className="projects-section">
          <h2 className="section-title">
            <FaProjectDiagram className="section-icon" />
            {isOwnProfile ? 'My Projects' : `${username}'s Projects`}
          </h2>
          
          {loading ? (
            <LoadingSpinner fullPage={false} text="Loading projects..." />
          ) : posts.length > 0 ? (
            <div className="profile-posts">
              <h3 className="section-title">Posts</h3>
              <div className="posts-grid">
                {posts.map((post) => (
                  <Post 
                    key={post.id} 
                    post={post} 
                    onCommentToggle={() => handleCommentToggle(post.id)}
                    isCommentsOpen={openComments === post.id}
                    onPostUpdate={handlePostUpdate}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="no-posts">
              <p>You haven't created any projects yet.</p>
              <button 
                className="btn btn-primary"
                onClick={() => navigate('/createPost')}
              >
                <FaPlus /> Create Your First Project
              </button>
            </div>
          )}
        </section>

        {userStats.skillsUsed.size > 0 && (
          <section className="skills-section">
            <h2 className="section-title">
              <FaCode />
              Skills & Technologies
            </h2>
            <div className="skills-cloud">
              {Array.from(userStats.skillsUsed).map((skill) => (
                <span key={skill} className="skill-badge">{skill}</span>
              ))}
            </div>
          </section>
        )}

        <section className="activity-section">
          <h2 className="section-title">
            <FaChartLine />
            Activity Overview
          </h2>
          <div className="activity-grid">
            <div className="activity-card">
              <FaTrophy className="activity-icon" />
              <h3>Most Used Technology</h3>
              <p>{Array.from(userStats.skillsUsed)[0] || 'No technologies yet'}</p>
            </div>
            <div className="activity-card">
              <FaGithub className="activity-icon" />
              <h3>GitHub Projects</h3>
              <p>{stats.githubProjects} Connected Repositories</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Profile; 