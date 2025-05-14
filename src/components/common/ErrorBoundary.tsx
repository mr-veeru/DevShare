/**
 * @fileoverview Error Boundary Component
 * A higher-order component that catches JavaScript errors in child components,
 * displays a fallback UI, and provides a way to recover from errors.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import './ErrorBoundary.css';

/**
 * Props interface for the ErrorBoundary component
 * @property {ReactNode} children - Child components to be rendered inside the error boundary
 * @property {ReactNode} fallback - Optional custom fallback UI to display when an error occurs
 */
interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

/**
 * State interface for the ErrorBoundary component
 * @property {boolean} hasError - Whether an error has been caught
 * @property {Error | null} error - The error that was caught, if any
 */
interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Error Boundary Component
 * Catches JavaScript errors in child components and displays a fallback UI
 */
export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="error-boundary">
                    <h2 className="error-boundary__title">
                        Something went wrong
                    </h2>
                    <p className="error-boundary__message">
                        {this.state.error?.message || 'An unexpected error occurred'}
                    </p>
                    <button
                        className="error-boundary__button"
                        onClick={() => window.location.reload()}
                    >
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
} 