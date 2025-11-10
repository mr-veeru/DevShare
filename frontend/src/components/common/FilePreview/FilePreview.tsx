/**
 * File Preview Component
 * 
 * Displays file information with icon, name, size, and download/remove actions.
 */

import React from 'react';
import { FaTimes } from 'react-icons/fa';
import { getFileIcon, getDisplayFilename, formatFileSize } from '../../../utils/fileUtils';

interface FilePreviewProps {
  // File information
  filename: string;
  contentType: string;
  size?: number;
  // Actions
  onDownload?: () => void;
  onRemove?: () => void;
  showRemove?: boolean;
  className?: string;
}

export const FilePreview: React.FC<FilePreviewProps> = ({
  filename,
  contentType,
  size,
  onDownload,
  onRemove,
  showRemove = false,
  className = ''
}) => {
  // Handle undefined/null values gracefully
  const safeFilename = filename || 'Unknown File';
  const safeContentType = contentType || 'application/octet-stream';
  const displayName = getDisplayFilename(safeFilename);

  return (
    <div className={`file-preview-container ${className}`}>
      <div className="file-preview-content">
        <div className="file-icon">
          {getFileIcon(safeFilename, safeContentType)}
        </div>
        <div className="file-info">
          <div className="file-name" title={displayName}>
            {displayName}
          </div>
          {size && (
            <div className="file-size">
              {formatFileSize(size)}
            </div>
          )}
        </div>
        {onDownload && (
          <button 
            className="file-download-btn"
            onClick={onDownload}
            title="Download file"
          >
            ⬇️
          </button>
        )}
      </div>

      {showRemove && onRemove && (
        <button
          className="file-remove"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          title="Remove file"
        >
          <FaTimes className="icon" />
        </button>
      )}
    </div>
  );
};

