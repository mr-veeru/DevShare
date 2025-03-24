/**
 * @fileoverview Confirmation Dialog Component
 * A reusable dialog component for confirming user actions with different types
 * of confirmations (warning, danger, info) and customizable content.
 */

import React from 'react';
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
  if (!isOpen) return null;

  return (
    <div className="confirmation-dialog-overlay">
      <div className="confirmation-dialog">
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="confirmation-dialog-buttons">
          <button onClick={onClose} className="cancel-button">
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="confirm-button"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}; 