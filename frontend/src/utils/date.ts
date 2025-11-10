/**
 * Date/time utilities
 */

// Format date as relative time - e.g., "5 min ago", "2h ago", "3 days ago"
export const formatRelative = (iso: string): string => {
  try {
    const date = new Date(iso.endsWith('Z') ? iso : iso + 'Z');
    const now = new Date();
    const diff = Math.max(0, now.getTime() - date.getTime());
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } catch {
    return 'just now';
  }
};

// Format date for display (e.g., "October 20 2025")
// Common format used across the entire app - handles null/undefined
export const formatDisplayDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  } catch {
    return '';
  }
};
