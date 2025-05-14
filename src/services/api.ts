import { auth } from '../config/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc,
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  setDoc,
  writeBatch,
  orderBy
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type {
  Comment,
  Post,
  LikesResponse,
  UserProfile,
  NotificationItem
} from '../types/api';

// Create a Firebase service instead of axios
const api = {
  baseURL: 'firebase'
};

// Posts API
export const getPosts = async (): Promise<Post[]> => {
  try {
    const postsRef = collection(db, 'posts');
    const postsSnapshot = await getDocs(postsRef);
    const posts = postsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Post[];
    
    return posts;
  } catch (error) {
    console.error('Error fetching posts:', error);
    return [];
  }
};

export const getPostById = async (postId: string): Promise<Post | null> => {
  try {
    const postRef = doc(db, 'posts', postId);
    const postSnapshot = await getDoc(postRef);
    
    if (!postSnapshot.exists()) {
      throw new Error('Post not found');
    }
    
    return { id: postSnapshot.id, ...postSnapshot.data() } as Post;
  } catch (error) {
    console.error('Error fetching post:', error);
    return null;
  }
};

export const createPost = async (postData: any): Promise<{ success: boolean; data?: Post; error?: string }> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User must be authenticated to create a post');
    
    const postWithMeta = {
      ...postData,
      userId: user.uid,
      createdAt: serverTimestamp(),
      likes: []  // Initialize empty likes array
    };
    
    const postRef = await addDoc(collection(db, 'posts'), postWithMeta);
    
    return { 
      success: true, 
      data: { id: postRef.id, ...postWithMeta } as Post 
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const updatePost = async (postId: string, postData: any): Promise<{ success: boolean; error?: string }> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User must be authenticated to update a post');
    
    const postRef = doc(db, 'posts', postId);
    const postSnapshot = await getDoc(postRef);
    
    if (!postSnapshot.exists()) {
      throw new Error('Post not found');
    }
    
    const post = postSnapshot.data();
    if (post.userId !== user.uid) {
      throw new Error('User not authorized to update this post');
    }
    
    await updateDoc(postRef, postData);
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const deletePost = async (postId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User must be authenticated to delete a post');
    
    const postRef = doc(db, 'posts', postId);
    const postSnapshot = await getDoc(postRef);
    
    if (!postSnapshot.exists()) {
      throw new Error('Post not found');
    }
    
    const post = postSnapshot.data();
    if (post.userId !== user.uid) {
      throw new Error('User not authorized to delete this post');
    }
    
    // Delete the post
    await deleteDoc(postRef);
    
    // Delete all notifications related to this post
    await deleteRelatedNotifications({ postId });
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Likes API
export const getLikes = async (postId: string): Promise<LikesResponse> => {
  try {
    const user = auth.currentUser;
    let allLikes: string[] = [];
    let userLiked = false;
    
    // 1. First check the post document for likes array
    const postRef = doc(db, 'posts', postId);
    const postSnapshot = await getDoc(postRef);
    
    if (postSnapshot.exists()) {
      const postData = postSnapshot.data();
      // Get likes from post document (newer format)
      if (Array.isArray(postData.likes)) {
        allLikes = [...postData.likes];
        if (user) {
          userLiked = allLikes.includes(user.uid);
        }
      }
    } else {
      console.error('Post not found when fetching likes:', postId);
    }
    
    // 2. Now check the likes collection for older likes (if any)
    try {
      const likesRef = collection(db, 'likes');
      const q = query(likesRef, where('postId', '==', postId));
      const likesSnapshot = await getDocs(q);
      
      if (!likesSnapshot.empty) {
        // Add likes from the separate collection
        likesSnapshot.docs.forEach(doc => {
          const likeData = doc.data();
          if (likeData.userId && !allLikes.includes(likeData.userId)) {
            allLikes.push(likeData.userId);
            // Check if current user liked this post
            if (user && likeData.userId === user.uid) {
              userLiked = true;
            }
          }
        });
        
        // If likes were found in the separate collection but not in the post,
        // update the post document to include these likes
        if (allLikes.length > 0 && postSnapshot.exists()) {
          const postData = postSnapshot.data();
          const existingLikes = Array.isArray(postData.likes) ? postData.likes : [];
          
          // Only update if there are new likes to add
          const newLikes = allLikes.filter(like => !existingLikes.includes(like));
          if (newLikes.length > 0) {
            // Update post with all likes
            try {
              await updateDoc(postRef, {
                likes: [...existingLikes, ...newLikes]
              });
              // console.log('Updated post with likes from separate collection');
            } catch (updateError) {
              console.error('Error updating post with likes:', updateError);
            }
          }
        }
      }
    } catch (collectionError) {
      console.error('Error checking likes collection:', collectionError);
      // Continue with just the likes from the post document
    }
    
    // Return combined likes data
    return { 
      data: allLikes,
      count: allLikes.length,
      userLiked: userLiked
    };
  } catch (error) {
    console.error('Error fetching likes:', error);
    return { 
      data: [],
      count: 0,
      userLiked: false
    };
  }
};

export const likePost = async (postId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User must be authenticated to like a post');
    
    const postRef = doc(db, 'posts', postId);
    const postSnapshot = await getDoc(postRef);
    
    if (!postSnapshot.exists()) {
      throw new Error('Post not found');
    }
    
    const postData = postSnapshot.data();
    
    // Check if user has already liked this post
    const likes = Array.isArray(postData.likes) ? postData.likes : [];
    if (likes.includes(user.uid)) {
      // console.log('User has already liked this post');
      return { success: true }; // Already liked
    }
    
    // 1. Add user to likes array in post document
    await updateDoc(postRef, {
      likes: arrayUnion(user.uid)
    });
    
    // 2. Also add a record in the likes collection for backward compatibility
    try {
      const likesRef = collection(db, 'likes');
      // Check if a like entry already exists
      const q = query(
        likesRef, 
        where('postId', '==', postId),
        where('userId', '==', user.uid)
      );
      const existingLikes = await getDocs(q);
      
      // Only add to likes collection if an entry doesn't already exist
      if (existingLikes.empty) {
        await addDoc(likesRef, {
          postId,
          userId: user.uid,
          createdAt: serverTimestamp()
        });
      }
    } catch (collectionError) {
      console.error('Error adding to likes collection:', collectionError);
      // Continue without adding to collection since we've already updated the post
    }
    
    // Send notification to post owner if not self-like
    if (postData.userId !== user.uid) {
      const postTitle = postData.title || "a post";
      
      // Create notification
      await createNotification(
        postData.userId,
        'like',
        postId,
        postTitle
      );
    }
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const unlikePost = async (postId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User must be authenticated to unlike a post');
    
    // 1. Update the post document to remove the user from likes array
    const postRef = doc(db, 'posts', postId);
    await updateDoc(postRef, {
      likes: arrayRemove(user.uid)
    });
    
    // 2. Also remove from likes collection if it exists
    try {
      const likesRef = collection(db, 'likes');
      const q = query(
        likesRef, 
        where('postId', '==', postId),
        where('userId', '==', user.uid)
      );
      const existingLikes = await getDocs(q);
      
      // Delete all matching like documents
      if (!existingLikes.empty) {
        const batch = writeBatch(db);
        existingLikes.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
      }
    } catch (collectionError) {
      console.error('Error removing from likes collection:', collectionError);
      // Continue since we've already updated the post
    }
    
    // Delete the like notification
    await deleteRelatedNotifications({ 
      postId,
      type: 'like',
      senderId: user.uid 
    });
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Comments API
export const getComments = async (postId: string): Promise<Comment[]> => {
  try {
    // Fetch all comments for this post
    const commentsRef = collection(db, 'comments');
    const q = query(commentsRef, where('postId', '==', postId));
    const commentsSnapshot = await getDocs(q);
    
    const comments = commentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Comment[];
    
    // Fetch all replies
    const repliesRef = collection(db, 'replies');
    const repliesQuery = query(repliesRef);
    const repliesSnapshot = await getDocs(repliesQuery);
    
    const replies = repliesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Comment[];
    
    // Filter to only include replies for this post's comments
    const commentIds = comments.map(comment => comment.id);
    const relevantReplies = replies.filter(reply => 
      reply.parentId && commentIds.includes(reply.parentId)
    );
    
    // Combine comments and replies
    const allComments = [...comments, ...relevantReplies];
    
    return allComments;
  } catch (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
};

export const createComment = async (postId: string, commentData: any): Promise<Comment> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User must be authenticated to comment');
    
    const commentWithMeta = {
      ...commentData,
      postId,
      userId: user.uid,
      createdAt: serverTimestamp(),
    };
    
    const commentRef = await addDoc(collection(db, 'comments'), commentWithMeta);

    // Get post data to create notification
    const postRef = doc(db, 'posts', postId);
    const postSnapshot = await getDoc(postRef);
    
    if (postSnapshot.exists()) {
      const postData = postSnapshot.data();
      
      // Create notification for post owner if commenter is not the post owner
      if (postData.userId !== user.uid) {
        const postTitle = postData.title || "a post";
        
        // Create notification
        await createNotification(
          postData.userId,
          'comment',
          postId,
          postTitle,
          commentRef.id,
          commentData.text
        );
      }
    }
    
    // Return data in a format that matches Comment object structure
    return {
      id: commentRef.id,
      ...commentWithMeta,
      createdAt: new Date().toISOString(), // Convert timestamp to string
      replies: []
    } as Comment;
  } catch (error) {
    throw error;
  }
};

export const updateComment = async (commentId: string, commentData: any): Promise<{ success: boolean; error?: string }> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User must be authenticated to update a comment');
    
    const commentRef = doc(db, 'comments', commentId);
    const commentSnapshot = await getDoc(commentRef);
    
    if (!commentSnapshot.exists()) {
      throw new Error('Comment not found');
    }
    
    const comment = commentSnapshot.data();
    if (comment.userId !== user.uid) {
      throw new Error('User not authorized to update this comment');
    }
    
    await updateDoc(commentRef, commentData);
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const deleteComment = async (commentId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User must be authenticated to delete a comment');
    
    const commentRef = doc(db, 'comments', commentId);
    const commentSnapshot = await getDoc(commentRef);
    
    if (!commentSnapshot.exists()) {
      throw new Error('Comment not found');
    }
    
    const comment = commentSnapshot.data();
    if (comment.userId !== user.uid) {
      throw new Error('User not authorized to delete this comment');
    }
    
    // Delete the comment
    await deleteDoc(commentRef);
    
    // Delete all notifications related to this comment - including likes, replies, etc.
    await deleteRelatedNotifications({ commentId });
    
    // Also delete all replies to this comment
    try {
      const repliesQuery = query(
        collection(db, 'replies'),
        where('parentId', '==', commentId)
      );
      const repliesSnapshot = await getDocs(repliesQuery);
      
      if (!repliesSnapshot.empty) {
        const batch = writeBatch(db);
        
        // Create an array of promises for deleting notifications
        const deletePromises: Promise<{ success: boolean; error?: string }>[] = [];
        
        repliesSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
          // Queue up notification deletions
          deletePromises.push(deleteRelatedNotifications({ commentId: doc.id }));
        });
        
        // Execute the batch delete for replies
        await batch.commit();
        
        // Wait for all notification deletions to complete
        await Promise.all(deletePromises);
      }
    } catch (error) {
      console.error('Error deleting comment replies:', error);
    }
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Comment Likes API
export const getCommentLikes = async (commentId: string): Promise<LikesResponse> => {
  try {
    // Try to find the document in the comments collection first
    let documentRef = doc(db, 'comments', commentId);
    let documentSnapshot = await getDoc(documentRef);
    
    // If not found in comments, try the replies collection
    if (!documentSnapshot.exists()) {
      documentRef = doc(db, 'replies', commentId);
      documentSnapshot = await getDoc(documentRef);
      
      if (!documentSnapshot.exists()) {
        throw new Error('Comment or reply not found');
      }
    }
    
    const document = documentSnapshot.data();
    // Ensure likes is always an array
    const likes = Array.isArray(document.likes) ? document.likes : [];
    const user = auth.currentUser;
    
    return { 
      data: likes,
      count: likes.length,
      userLiked: user ? likes.includes(user.uid) : false
    };
  } catch (error) {
    console.error('Error fetching likes:', error);
    return { 
      data: [],
      count: 0,
      userLiked: false
    };
  }
};

export const likeComment = async (commentId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User must be authenticated to like a comment');
    
    // Check if it's a comment or reply
    let documentRef = doc(db, 'comments', commentId);
    let documentSnapshot = await getDoc(documentRef);
    let isComment = true;
    
    // If not found in comments, try the replies collection
    if (!documentSnapshot.exists()) {
      documentRef = doc(db, 'replies', commentId);
      documentSnapshot = await getDoc(documentRef);
      isComment = false;
      
      if (!documentSnapshot.exists()) {
        throw new Error('Comment or reply not found');
      }
    }
    
    const commentData = documentSnapshot.data();
    
    // Update the document with the like
    await updateDoc(documentRef, {
      likes: arrayUnion(user.uid)
    });
    
    // Send notification to comment/reply owner if not self-like
    if (commentData.userId !== user.uid) {
      // Get post data for the notification
      let postId = commentData.postId;
      let postTitle = "a post";
      
      // Get post title if available
      if (postId) {
        try {
          const postRef = doc(db, 'posts', postId);
          const postSnapshot = await getDoc(postRef);
          if (postSnapshot.exists()) {
            const postData = postSnapshot.data();
            postTitle = postData.title || postTitle;
          }
        } catch (error) {
          console.error("Error fetching post for notification:", error);
        }
      }
      
      // Create notification
      await createNotification(
        commentData.userId, 
        isComment ? 'comment_like' : 'reply_like',
        postId,
        postTitle,
        commentId,
        commentData.text
      );
    }
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const unlikeComment = async (commentId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User must be authenticated to unlike a comment');
    
    // Check if it's a comment or reply
    let isComment = true;
    let documentRef = doc(db, 'comments', commentId);
    let documentSnapshot = await getDoc(documentRef);
    
    // If not found in comments, try the replies collection
    if (!documentSnapshot.exists()) {
      documentRef = doc(db, 'replies', commentId);
      documentSnapshot = await getDoc(documentRef);
      isComment = false;
      
      if (!documentSnapshot.exists()) {
        throw new Error('Comment or reply not found');
      }
    }
    
    // Update the document to remove the like
    await updateDoc(documentRef, {
      likes: arrayRemove(user.uid)
    });
    
    // Delete related notification
    await deleteRelatedNotifications({
      commentId,
      type: isComment ? 'comment_like' : 'reply_like',
      senderId: user.uid
    });
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Replies API
export const getReplies = async (commentId: string): Promise<Comment[]> => {
  try {
    const repliesRef = collection(db, 'replies');
    const q = query(repliesRef, where('commentId', '==', commentId));
    const repliesSnapshot = await getDocs(q);
    
    const replies = repliesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Comment[];
    
    return replies;
  } catch (error) {
    console.error('Error fetching replies:', error);
    return [];
  }
};

export const createReply = async (commentId: string, replyData: any): Promise<Comment> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User must be authenticated to reply');
    
    const replyWithMeta = {
      ...replyData,
      commentId,
      userId: user.uid,
      createdAt: serverTimestamp(),
      postId: replyData.postId // Make sure postId is included
    };
    
    // First, create the reply document
    const replyRef = await addDoc(collection(db, 'replies'), replyWithMeta);
    
    // Now, update the parent comment to include this reply in its replies array
    const commentRef = doc(db, 'comments', commentId);
    const commentSnapshot = await getDoc(commentRef);
    
    if (commentSnapshot.exists()) {
      const commentData = commentSnapshot.data();
      // Create an array with the new reply ID if replies doesn't exist yet
      await updateDoc(commentRef, {
        hasReplies: true
      });
      
      // Get post data for the notification
      const postId = replyData.postId;
      let postTitle = "a post";
      let postOwnerId = null;
      
      // Get post title and owner if available
      if (postId) {
        try {
          const postRef = doc(db, 'posts', postId);
          const postSnapshot = await getDoc(postRef);
          if (postSnapshot.exists()) {
            const postData = postSnapshot.data();
            postTitle = postData.title || postTitle;
            postOwnerId = postData.userId;
          }
        } catch (error) {
          console.error("Error fetching post for notification:", error);
        }
      }
      
      // Create notification for the comment owner (if not self-reply)
      if (commentData.userId !== user.uid) {
        await createNotification(
          commentData.userId,
          'reply',
          postId,
          postTitle,
          commentId,
          replyData.text
        );
      }
      
      // Also notify the post owner (if not self-reply and not the same as comment owner)
      if (postOwnerId && postOwnerId !== user.uid && postOwnerId !== commentData.userId) {
        await createNotification(
          postOwnerId,
          'reply',
          postId,
          postTitle,
          commentId,
          replyData.text
        );
      }
    }
    
    // Return data in a format that matches Comment object structure
    return {
      id: replyRef.id,
      ...replyWithMeta,
      createdAt: new Date().toISOString(), // Convert timestamp to string
    } as Comment;
  } catch (error) {
    throw error;
  }
};

export const updateReply = async (replyId: string, replyData: any): Promise<{ success: boolean; error?: string }> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User must be authenticated to update a reply');
    
    const replyRef = doc(db, 'replies', replyId);
    const replySnapshot = await getDoc(replyRef);
    
    if (!replySnapshot.exists()) {
      throw new Error('Reply not found');
    }
    
    const reply = replySnapshot.data();
    if (reply.userId !== user.uid) {
      throw new Error('User not authorized to update this reply');
    }
    
    await updateDoc(replyRef, replyData);
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const deleteReply = async (replyId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User must be authenticated to delete a reply');
    
    const replyRef = doc(db, 'replies', replyId);
    const replySnapshot = await getDoc(replyRef);
    
    if (!replySnapshot.exists()) {
      throw new Error('Reply not found');
    }
    
    const reply = replySnapshot.data();
    if (reply.userId !== user.uid) {
      throw new Error('User not authorized to delete this reply');
    }
    
    // Delete the reply
    await deleteDoc(replyRef);
    
    // Delete all notifications related to this reply
    await deleteRelatedNotifications({ commentId: replyId });
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// User Profile API
export const getUserProfile = async (): Promise<UserProfile | null> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User must be authenticated to get profile');
    
    const userRef = doc(db, 'users', user.uid);
    const userSnapshot = await getDoc(userRef);
    
    if (!userSnapshot.exists()) {
      // Create a new user profile if it doesn't exist
      const newUserData = {
        userId: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        createdAt: serverTimestamp(),
      };
      
      await setDoc(userRef, newUserData);
      
      return {
        id: user.uid,
        ...newUserData,
        createdAt: new Date().toISOString()
      } as UserProfile;
    }
    
    return { id: userSnapshot.id, ...userSnapshot.data() } as UserProfile;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

export const updateUserProfile = async (profileData: any): Promise<{ success: boolean; error?: string }> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User must be authenticated to update profile');
    
    const userRef = doc(db, 'users', user.uid);
    
    await updateDoc(userRef, {
      ...profileData,
      updatedAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Notifications API
export const getNotifications = async (): Promise<NotificationItem[]> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User must be authenticated to get notifications');
    
    const notificationsRef = collection(db, 'notifications');
    // Using userId field to query notifications (we added this in createNotification)
    const q = query(
      notificationsRef, 
      where('userId', '==', user.uid),
      // Order by creation time so newest notifications appear first
      orderBy('createdAt', 'desc')
    );
    
    // console.log('Fetching notifications for user:', user.uid);
    const notificationsSnapshot = await getDocs(q);
    
    // console.log('Found notifications:', notificationsSnapshot.size);
    
    const notifications = notificationsSnapshot.docs.map(doc => {
      const data = doc.data();
      // Convert Firestore timestamp to a format the app can use
      const createdAt = data.createdAt ? 
        (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : 
        new Date().toISOString();
        
      return {
        id: doc.id,
        ...data,
        createdAt
      };
    }) as NotificationItem[];
    
    // console.log('Processed notifications:', notifications.length);
    return notifications;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
};

export const markNotificationAsRead = async (notificationId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User must be authenticated to mark notification as read');
    
    const notificationRef = doc(db, 'notifications', notificationId);
    const notificationSnapshot = await getDoc(notificationRef);
    
    if (!notificationSnapshot.exists()) {
      throw new Error('Notification not found');
    }
    
    const notification = notificationSnapshot.data();
    if (notification.userId !== user.uid) {
      throw new Error('User not authorized to update this notification');
    }
    
    await updateDoc(notificationRef, { read: true });
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const deleteNotification = async (notificationId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User must be authenticated to delete notification');
    
    const notificationRef = doc(db, 'notifications', notificationId);
    const notificationSnapshot = await getDoc(notificationRef);
    
    if (!notificationSnapshot.exists()) {
      throw new Error('Notification not found');
    }
    
    const notification = notificationSnapshot.data();
    if (notification.userId !== user.uid) {
      throw new Error('User not authorized to delete this notification');
    }
    
    await deleteDoc(notificationRef);
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const markAllNotificationsAsRead = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User must be authenticated to mark all notifications as read');
    
    const notificationsRef = collection(db, 'notifications');
    const q = query(notificationsRef, where('userId', '==', user.uid), where('read', '==', false));
    const notificationsSnapshot = await getDocs(q);
    
    const batch = writeBatch(db);
    
    notificationsSnapshot.docs.forEach(doc => {
      const notificationRef = doc.ref;
      batch.update(notificationRef, { read: true });
    });
    
    await batch.commit();
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Authentication
export const verifyUser = async (): Promise<{ uid: string; email: string | null; displayName: string | null; photoURL: string | null; verified: boolean } | null> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No user logged in');
    
    return { 
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      verified: true 
    };
  } catch (error) {
    console.error('Error verifying user:', error);
    return null;
  }
};

export const getUserByUsername = async (username: string): Promise<UserProfile | null> => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username));
    const usersSnapshot = await getDocs(q);
    
    if (usersSnapshot.empty) {
      throw new Error('User not found');
    }
    
    const userDoc = usersSnapshot.docs[0];
    
    return { id: userDoc.id, ...userDoc.data() } as UserProfile;
  } catch (error) {
    console.error('Error getting user by username:', error);
    return null;
  }
};

// Create notification function
export const createNotification = async (
  recipientId: string,
  notificationType: string,
  postId: string | undefined,
  postTitle: string,
  commentId?: string,
  content?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User must be authenticated to create a notification');
    
    // Don't create notification if postId is missing
    if (!postId) {
      console.error('Cannot create notification: Missing postId');
      return { 
        success: false, 
        error: 'Missing postId'
      };
    }
    
    const notificationData: any = {
      userId: recipientId, // This should be userId not recipientId for proper querying
      recipientId, 
      senderId: user.uid,
      senderName: user.displayName || 'Anonymous',
      type: notificationType,
      read: false,
      createdAt: serverTimestamp(),
      postId,
      postTitle: postTitle || 'Unknown Post'
    };
    
    // Add optional fields if provided
    if (commentId) {
      notificationData.commentId = commentId;
    }
    
    if (content) {
      // Limit content length to avoid large notification objects
      notificationData.content = content.length > 100 ? content.substring(0, 97) + '...' : content;
    }
    
    // console.log('Creating notification:', notificationData);
    
    // Create notification in Firestore
    await addDoc(collection(db, 'notifications'), notificationData);
    
    return { success: true };
  } catch (error) {
    console.error('Error creating notification:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Test endpoints
export const testBackend = async (): Promise<{ message: string }> => {
  // This function should always succeed since it doesn't do any
  // operations that could throw errors
  return { message: "Firebase is connected correctly" };
};

export const getProtectedData = async (): Promise<{ message: string } | null> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User must be authenticated to access protected data');
    
    return { message: "You are authenticated and can access protected data" };
  } catch (error) {
    console.error('Error getting protected data:', error);
    return null;
  }
};

/**
 * Deletes all notifications related to a specific post or comment
 */
export const deleteRelatedNotifications = async (
  params: {
    postId?: string;
    commentId?: string;
    type?: string;
    senderId?: string;
  }
): Promise<{ success: boolean; error?: string }> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User must be authenticated to delete notifications');
    
    const { postId, commentId, type, senderId } = params;
    
    if (!postId && !commentId && !type && !senderId) {
      throw new Error('At least one filter parameter is required');
    }
    
    // Build the query based on provided filters
    let q = query(collection(db, 'notifications'));
    
    if (postId) {
      q = query(q, where('postId', '==', postId));
    }
    
    if (commentId) {
      q = query(q, where('commentId', '==', commentId));
    }
    
    if (type) {
      q = query(q, where('type', '==', type));
    }
    
    if (senderId) {
      q = query(q, where('senderId', '==', senderId));
    }
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      // console.log('No notifications found to delete with params:', params);
      return { success: true }; // No notifications to delete
    }
    
    // Delete all matching notifications
    const batch = writeBatch(db);
    
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    // console.log(`Successfully deleted ${snapshot.docs.length} notifications with params:`, params);
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting related notifications:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export default api; 