/**
 * Feed Component
 * 
 * Main social feed component that provides:
 * - Core Features:
 *   - Real-time post loading with infinite scroll
 *   - Advanced search functionality (title, description, skills)
 *   - Dynamic skill-based filtering
 *   - Expandable/collapsible comment sections
 * 
 * - Technical Features:
 *   - Firestore integration with pagination
 *   - Optimized performance for large post collections
 *   - Responsive grid layout for all screen sizes
 *   - Error handling and loading states
 *   - Accessibility support with ARIA labels
 * 
 * @component
 */

import { useEffect, useCallback, useRef, useMemo, useState } from 'react';
import { collection, getDocs, query, orderBy, limit, startAfter } from 'firebase/firestore';
import { db } from '../../config/firebase';
import Post from './Post';
import { LoadingSpinner } from '../../components/common';
import { FaSearch, FaCode, FaExclamationCircle } from 'react-icons/fa';
import './Feed.css';

// Constants
const POSTS_PER_PAGE = 5;

/**
 * Interface for post data structure
 * @interface PostItem
 */
export interface PostItem {
  id: string;              // Unique identifier for the post
  userId: string;          // ID of the user who created the post
  title: string;          // Post title
  username: string;       // Display name of the post author
  description: string;    // Post content/description
  createdAt: number;      // Timestamp when post was created
  githubLink?: string;    // Optional GitHub repository link
  skills?: string;        // Comma-separated list of skills
}

/**
 * Main feed component for displaying and filtering posts
 */
const Feed = () => {
  // Move state from context into component
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);
  
  /**
   * Loads initial set of posts with pagination
   * @param {boolean} refresh - Whether to refresh the entire feed
   */
  const loadPosts = useCallback(async (refresh = false) => {
    try {
      setLoading(true);
      
      const postsQuery = query(
        collection(db, "posts"),
        orderBy("createdAt", "desc"),
        limit(POSTS_PER_PAGE)
      );
      
      const snapshot = await getDocs(postsQuery);
      const fetchedPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PostItem[];
      
      setPosts(fetchedPosts);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === POSTS_PER_PAGE);
    } catch (err) {
      console.error("Error loading posts:", err);
      setError("Failed to load posts. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);
  
  /**
   * Loads more posts when user scrolls to bottom
   * Implements infinite scroll pagination
   */
  const loadMorePosts = useCallback(async () => {
    if (!lastDoc || !hasMore) return;
    
    try {
      setLoading(true);
      
      const postsQuery = query(
        collection(db, "posts"),
        orderBy("createdAt", "desc"),
        startAfter(lastDoc),
        limit(POSTS_PER_PAGE)
      );
      
      const snapshot = await getDocs(postsQuery);
      const fetchedPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PostItem[];
      
      setPosts(prev => [...prev, ...fetchedPosts]);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === POSTS_PER_PAGE);
    } catch (err) {
      console.error("Error loading more posts:", err);
      setError("Failed to load more posts. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [lastDoc, hasMore]);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [availableSkills, setAvailableSkills] = useState<string[]>([]);
  
  const observer = useRef<IntersectionObserver>();
  const lastPostRef = useCallback((node: HTMLDivElement) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMorePosts();
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, hasMore, loadMorePosts]);

  // Create a ref to store post elements with their IDs
  const postRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  
  // Create a visibility observer to detect when posts move out of view
  const visibilityObserver = useRef<IntersectionObserver | null>(null);
  
  // Initialize the visibility observer to close comments when scrolling away
  useEffect(() => {
    visibilityObserver.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          // When post is no longer visible AND it has open comments, close them
          if (!entry.isIntersecting) {
            const postId = entry.target.getAttribute('data-post-id');
            if (postId && postId === activeCommentPostId) {
              setActiveCommentPostId(null);
            }
          }
        });
      },
      {
        threshold: 0.2, // Post is considered invisible when less than 20% is visible
        rootMargin: "-10% 0px" // Add some margin to trigger slightly earlier
      }
    );
    
    return () => {
      if (visibilityObserver.current) {
        visibilityObserver.current.disconnect();
      }
    };
  }, [activeCommentPostId]);
  
  // Register/unregister posts with the visibility observer
  useEffect(() => {
    // Only observe posts if we have an active comment
    if (!activeCommentPostId || !visibilityObserver.current) return;
    
    // Observe the post with open comments
    const postElement = postRefs.current.get(activeCommentPostId);
    if (postElement) {
      visibilityObserver.current.observe(postElement);
    }
    
    return () => {
      if (visibilityObserver.current) {
        visibilityObserver.current.disconnect();
      }
    };
  }, [activeCommentPostId]);

  useEffect(() => {
    loadPosts(true);
  }, [loadPosts]);

  // Extract skills from posts and update availableSkills
  useEffect(() => {
    if (posts.length > 0) {
      // Use Map to track normalized skills (lowercase) to display version (uppercase)
      const skillsMap = new Map<string, string>();
      
      posts.forEach(post => {
        if (post.skills) {
          post.skills.split(',')
            .map(skill => skill.trim())
            .filter(skill => skill)
            .forEach(skill => {
              // Store lowercase as key for deduplication, uppercase as display value
              const normalizedSkill = skill.toLowerCase();
              skillsMap.set(normalizedSkill, skill.toUpperCase());
            });
        }
      });
      
      // Extract display versions (uppercase) of skills and sort them
      const newSkills = Array.from(skillsMap.values()).sort();
      
      // Only update if the skills have actually changed
      if (JSON.stringify(newSkills) !== JSON.stringify(availableSkills)) {
        setAvailableSkills(newSkills);
        
        // If a deleted skill was being used as a filter, reset to 'all'
        if (activeFilter !== 'all' && !newSkills.map(s => s.toLowerCase()).includes(activeFilter.toLowerCase())) {
          setActiveFilter('all');
        }
      }
    }
  }, [posts, activeFilter, availableSkills]);

  /**
   * Filters posts based on search query and active skill filter
   * @returns {PostItem[]} Filtered posts array
   */
  const getFilteredPosts = useMemo(() => {
    if (!posts.length) return [];
    
    let filtered = posts;
    
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase().trim();
      
      // First filter posts that match the search query
      filtered = filtered.filter(post => 
        post.title?.toLowerCase().includes(searchLower) ||
        post.description?.toLowerCase().includes(searchLower) ||
        post.username?.toLowerCase().includes(searchLower) ||
        (post.skills && post.skills.toLowerCase().includes(searchLower))
      );
      
      // Then sort by relevance if we have a search query
      if (searchLower && filtered.length > 1) {
        filtered.sort((a, b) => {
          // Calculate relevance score based on number of matches
          const getRelevanceScore = (post: PostItem) => {
            let score = 0;
            
            // Title matches are most important (multiplier of 3)
            if (post.title?.toLowerCase().includes(searchLower)) {
              score += 3 * (post.title.toLowerCase().match(new RegExp(searchLower, 'g')) || []).length;
            }
            
            // Description matches (multiplier of 1)
            if (post.description?.toLowerCase().includes(searchLower)) {
              score += (post.description.toLowerCase().match(new RegExp(searchLower, 'g')) || []).length;
            }
            
            // Username matches (multiplier of 2)
            if (post.username?.toLowerCase().includes(searchLower)) {
              score += 2 * (post.username.toLowerCase().match(new RegExp(searchLower, 'g')) || []).length;
            }
            
            // Skills matches (multiplier of 2)
            if (post.skills?.toLowerCase().includes(searchLower)) {
              score += 2 * (post.skills.toLowerCase().match(new RegExp(searchLower, 'g')) || []).length;
            }
            
            return score;
          };
          
          return getRelevanceScore(b) - getRelevanceScore(a);
        });
      }
    }
    
    if (activeFilter !== 'all') {
      filtered = filtered.filter(post => {
        if (!post.skills) return false;
        
        // Split skills, normalize to lowercase, and check if any match the filter
        const postSkills = post.skills.split(',')
          .map(skill => skill.trim().toLowerCase());
        
        return postSkills.includes(activeFilter.toLowerCase());
      });
    }
    
    return filtered;
  }, [posts, searchQuery, activeFilter]);

  const handleCommentToggle = useCallback((postId: string) => {
    setActiveCommentPostId((prev: string | null) => prev === postId ? null : postId);
  }, []);

  // Add a function to handle post updates including skills changes
  const handlePostUpdate = useCallback((postId: string, updatedPost: Partial<PostItem> | null) => {
    // If the post was deleted
    if (!updatedPost) {
      setPosts(prevPosts => prevPosts.filter(p => p.id !== postId));
      return;
    }
    
    // Update the post in the posts array
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === postId 
          ? { ...post, ...updatedPost }
          : post
      )
    );
  }, []);

  const clearFilters = () => {
    setSearchQuery('');
    setActiveFilter('all');
  };

  return (
    <div className="main-container">
      <div className="feed-header">
        <h1 className="feed-title"><FaCode /> DevShare Feed</h1>
        <p className="feed-subtitle">Discover amazing projects from the developer community</p>
      </div>
      
      {error && (
        <div className="feed-error-message">
          <FaExclamationCircle />
          <span>{error}</span>
          <button onClick={() => loadPosts(true)}>
            Retry
          </button>
        </div>
      )}
      
      <div className="search-container">
        <form 
          className="search-input-wrapper"
          onSubmit={(e) => {
            e.preventDefault();
            if (document.activeElement instanceof HTMLElement) {
              document.activeElement.blur(); // Hide the keyboard
            }
          }}
        >
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search by title, description, or skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur(); // Hide the mobile keyboard
              }
            }}
            className="search-input"
            aria-label="Search posts"
          />
          {searchQuery && (
            <button 
              type="button"
              className="search-clear-button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </form>
      </div>
      
      {/* Add search results counter */}
      {(searchQuery || activeFilter !== 'all') && (
        <div className="search-results-count">
          Found {getFilteredPosts.length} {getFilteredPosts.length === 1 ? 'result' : 'results'}
          {searchQuery && <> for "<strong>{searchQuery}</strong>"</>}
          {activeFilter !== 'all' && <> in <strong>{activeFilter}</strong></>}
        </div>
      )}
      
      <div className="filter-container" aria-label="Filter by skills">
        <button 
          className={`filter-button ${activeFilter === 'all' ? 'active' : ''}`}
          onClick={() => setActiveFilter('all')}
          aria-pressed={activeFilter === 'all' ? 'true' : 'false'}
        >
          All
        </button>
        
        {availableSkills.map((skill: string) => (
          <button 
            key={skill}
            className={`filter-button ${activeFilter.toLowerCase() === skill.toLowerCase() ? 'active' : ''}`}
            onClick={() => setActiveFilter(skill.toLowerCase())}
            aria-pressed={activeFilter.toLowerCase() === skill.toLowerCase() ? 'true' : 'false'}
          >
            {skill}
          </button>
        ))}
        
        {(searchQuery || activeFilter !== 'all') && (
          <button 
            className="filter-clear-button"
            onClick={clearFilters}
            aria-label="Clear all filters"
          >
            Clear Filters
          </button>
        )}
      </div>
      
      <div className="posts-container">
        {loading && posts.length === 0 ? (
          <LoadingSpinner text="Loading posts..." />
        ) : getFilteredPosts.length > 0 ? (
          getFilteredPosts.map((post, index) => (
            <div
              key={post.id}
              ref={(node) => {
                if (node) {
                  postRefs.current.set(post.id, node);
                } else {
                  postRefs.current.delete(post.id);
                }
                if (index === getFilteredPosts.length - 1) {
                  lastPostRef(node as HTMLDivElement);
                }
              }}
              data-post-id={post.id}
            >
              <Post 
                post={post} 
                isCommentsOpen={activeCommentPostId === post.id}
                onCommentToggle={handleCommentToggle}
                onPostUpdate={handlePostUpdate}
                searchQuery={searchQuery.toLowerCase().trim()}
              />
            </div>
          ))
        ) : (
          <div className="no-posts-found">
            <FaSearch size={48} color="#ccc" />
            <h3>No matching projects found</h3>
            <p>{searchQuery || activeFilter !== 'all' ? 
                 'Try adjusting your search or filters' : 
                 'No posts available. Create your first post!'}</p>
            {(searchQuery || activeFilter !== 'all') && (
              <button 
                className="btn btn-primary"
                onClick={clearFilters}
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
        
        {loading && posts.length > 0 && (
          <div className="loading-more">
            <LoadingSpinner text="Loading more posts..." size="small" />
          </div>
        )}
      </div>
    </div>
  );
};

export default Feed;
