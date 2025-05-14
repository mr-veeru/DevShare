/**
 * @fileoverview Confirmation Dialog Component
 * A reusable dialog component for confirming user actions with different types
 * of confirmations (warning, danger, info) and customizable content.
 */

import React, { useEffect, useRef } from 'react';
import './ConfirmationDialog.css';

export interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  
  // Handle escape key press to close dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
  
  // Set focus to cancel button when dialog opens
  useEffect(() => {
    if (isOpen && cancelButtonRef.current) {
      cancelButtonRef.current.focus();
    }
  }, [isOpen]);
  
  // Focus trap inside dialog
  const handleTabKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    
    if (dialogRef.current && cancelButtonRef.current && confirmButtonRef.current) {
      const focusableElements = dialogRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
      
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="confirmation-dialog-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-message"
      onClick={(e) => {
        // Close when clicking on the overlay (outside the dialog)
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={handleTabKey}
    >
      <div className="confirmation-dialog" ref={dialogRef}>
        <h2 id="dialog-title">{title}</h2>
        <p id="dialog-message">{message}</p>
        <div className="confirmation-dialog-buttons">
          <button 
            onClick={onClose} 
            className="cancel-button"
            ref={cancelButtonRef}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="confirm-button"
            ref={confirmButtonRef}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}; 