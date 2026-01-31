// API Base URL Configuration
export const API_BASE_URL = `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api`;

// Backend Base URL (without /api)
export const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

/**
 * Convert relative download URL to absolute backend URL
 * @param downloadUrl - Relative URL from backend (e.g., "/api/files/download/...")
 * @returns Absolute URL to backend (e.g., "http://localhost:3001/api/files/download/...")
 */
export const getAbsoluteImageUrl = (downloadUrl?: string): string | undefined => {
  if (!downloadUrl) return undefined;
  
  // If already absolute URL, return as is
  if (downloadUrl.startsWith('http://') || downloadUrl.startsWith('https://')) {
    return downloadUrl;
  }
  
  // Convert relative URL to absolute
  return `${BACKEND_BASE_URL}${downloadUrl}`;
};
