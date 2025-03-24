export interface User {
    uid: string;
    email: string;
    username?: string;
    displayName?: string;
    photoURL?: string;
    bio?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface Post {
    id: string;
    userId: string;
    title: string;
    content: string;
    code?: string;
    language?: string;
    tags?: string[];
    likes?: number;
    createdAt: string;
    updatedAt?: string;
    user?: User;
}

export interface Comment {
    id: string;
    postId: string;
    userId: string;
    content: string;
    likes?: number;
    createdAt: string;
    updatedAt?: string;
    user?: User;
    replies?: Comment[];
}

export interface ApiResponse<T> {
    data?: T;
    error?: string;
    message?: string;
} 