/**
 * File Utility Functions
 * 
 * Provides shared file handling utilities for icon detection, size formatting,
 * download URLs, and filename extraction.
 */

import React from 'react';
import { API_BASE, authenticatedFetch } from './auth';
import { 
  SiPython, 
  SiJavascript, 
  SiTypescript, 
  SiHtml5, 
  SiCss3, 
  SiCplusplus,
  SiC,
  SiReact,
  SiPhp,
  SiYaml,
  SiNodedotjs
} from 'react-icons/si';
import { FaFilePdf, FaFileWord, FaFileExcel, FaFilePowerpoint, FaFileCode, FaFileAlt, FaCoffee, FaFileArchive, FaFile, FaVideo, FaImage, FaMusic } from 'react-icons/fa';
import { FaComputer, FaDatabase } from 'react-icons/fa6';

// Icon color constants for dark theme
const ICON_COLORS = {
  blue: '#60a5fa',
  gray: '#a0a0a0',
  red: '#f87171',
  green: '#4ade80',
  yellow: '#fde047',
  orange: '#fb923c',
  purple: '#a78bfa',
  gold: '#fbbf24',
} as const;

export const getFileIcon = (filename: string, contentType: string): React.ReactNode => {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  // Known extensions that should use specific icons (prioritize extension over content-type)
  const knownExtensions = ['py', 'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'java', 'cpp', 'c', 'h', 'php', 'json', 'yaml', 'yml', 'node', 'xml', 'env', 'sql', 'zip', 'rar', '7z', 'xls', 'xlsx', 'ppt', 'pptx', 'doc', 'docx', 'pdf', 'exe', 'msi', 'sh', 'bat', 'md', 'txt', 'readme'];
  
  // Check by file extension first for known extensions (more accurate for code files)
  if (extension && knownExtensions.includes(extension)) {
  switch (extension) {
    case 'txt':
      return <FaFileAlt className="icon" style={{ color: ICON_COLORS.gray }} />;
    case 'md':
    case 'readme':
      return <FaFileAlt className="icon" style={{ color: ICON_COLORS.blue }} />;
    case 'doc':
    case 'docx':
      return <FaFileWord className="icon" style={{ color: ICON_COLORS.blue }} />;
    case 'pdf':
      return <FaFilePdf className="icon" style={{ color: ICON_COLORS.red }} />;
    case 'py':
      return <SiPython className="icon" style={{ color: ICON_COLORS.blue }} />;
    case 'js':
      return <SiJavascript className="icon" style={{ color: ICON_COLORS.yellow }} />;
    case 'jsx':
      return <SiReact className="icon" style={{ color: ICON_COLORS.blue }} />;
    case 'ts':
      return <SiTypescript className="icon" style={{ color: ICON_COLORS.blue }} />;
    case 'tsx':
      return <SiReact className="icon" style={{ color: ICON_COLORS.blue }} />;
    case 'html':
      return <SiHtml5 className="icon" style={{ color: ICON_COLORS.orange }} />;
    case 'css':
      return <SiCss3 className="icon" style={{ color: ICON_COLORS.blue }} />;
    case 'java':
      return <FaCoffee className="icon" style={{ color: ICON_COLORS.orange }} />;
    case 'c':
      return <SiC className="icon" style={{ color: ICON_COLORS.blue }} />;
    case 'cpp':
    case 'h':
      return <SiCplusplus className="icon" style={{ color: ICON_COLORS.blue }} />;
    case 'php':
      return <SiPhp className="icon" style={{ color: ICON_COLORS.purple }} />;
    case 'json':
      return <FaFileCode className="icon" style={{ color: ICON_COLORS.gold }} />;
    case 'yaml':
    case 'yml':
      return <SiYaml className="icon" style={{ color: ICON_COLORS.red }} />;
    case 'node':
      return <SiNodedotjs className="icon" style={{ color: ICON_COLORS.green }} />;
    case 'xml':
      return <FaFileCode className="icon" style={{ color: ICON_COLORS.gray }} />;
    case 'env':
      return <FaFileCode className="icon" style={{ color: ICON_COLORS.green }} />;
    case 'exe':
    case 'msi':
    case 'sh':
    case 'bat':
      return <FaComputer className="icon" style={{ color: ICON_COLORS.gray }} />;
    case 'sql':
      return <FaDatabase className="icon" style={{ color: ICON_COLORS.blue }} />;
    case 'zip':
    case 'rar':
    case '7z':
      return <FaFileArchive className="icon" style={{ color: ICON_COLORS.orange }} />;
    case 'xls':
    case 'xlsx':
      return <FaFileExcel className="icon" style={{ color: ICON_COLORS.green }} />;
    case 'ppt':
    case 'pptx':
      return <FaFilePowerpoint className="icon" style={{ color: ICON_COLORS.red }} />;
    default:
      return <FaFile className="icon" style={{ color: ICON_COLORS.gray }} />;
    }
  }
  
  // Fallback to content type for unknown extensions
  if (contentType.includes('image')) return <FaImage className="icon" style={{ color: ICON_COLORS.green }} />;
  if (contentType.includes('video')) return <FaVideo className="icon" style={{ color: ICON_COLORS.red }} />;
  if (contentType.includes('audio')) return <FaMusic className="icon" style={{ color: ICON_COLORS.purple }} />;
  if (contentType.includes('text')) return <FaFileAlt className="icon" style={{ color: ICON_COLORS.gray }} />;
  
  // Final fallback for unknown files
  return <FaFile className="icon" style={{ color: ICON_COLORS.gray }} />;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const getFileDownloadUrl = (postId: string, fileId: string): string => {
  return `${API_BASE}/api/feed/posts/${postId}/files/${fileId}`;
};

export const getDisplayFilename = (filename: string): string => {
  // Handle undefined or null filename
  if (!filename) return 'Unknown File';
  
  // Check if filename contains UUID prefix (36 chars + underscore)
  if (filename.includes('_') && filename.length > 36) {
    // Check if the first part looks like a UUID (36 characters)
    const potentialUuid = filename.substring(0, 36);
    if (potentialUuid.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return filename.substring(37); // Remove UUID_ prefix
    }
  }
  return filename;
};

// Download file from server

export const downloadFile = async (
  postId: string,
  fileId: string,
  filename: string,
  onError?: (error: string) => void
): Promise<void> => {
  try {
    const response = await authenticatedFetch(`${API_BASE}/api/feed/posts/${postId}/files/${fileId}`);

    if (!response.ok) {
      throw new Error('Failed to download file');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    const errorMessage = 'Failed to download file';
    if (onError) {
      onError(errorMessage);
    } else {
      throw new Error(errorMessage);
    }
  }
};
