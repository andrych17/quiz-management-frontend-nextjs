/**
 * Debug Logger Utility
 * 
 * Only logs when NEXT_PUBLIC_DEBUG_MODE is enabled
 * Usage: logger.debug('My message', data)
 */

const isDebugMode = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';

export const logger = {
  /**
   * Debug log - only shows in debug mode
   */
  debug: (...args: any[]) => {
    if (isDebugMode) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * Info log - only shows in debug mode
   */
  info: (...args: any[]) => {
    if (isDebugMode) {
      console.info('[INFO]', ...args);
    }
  },

  /**
   * Warning log - always shows
   */
  warn: (...args: any[]) => {
    console.warn('[WARN]', ...args);
  },

  /**
   * Error log - always shows
   */
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  },

  /**
   * API Request log - only shows in debug mode
   */
  api: (method: string, url: string, data?: any) => {
    if (isDebugMode) {
      console.log(
        `%c[API ${method}]%c ${url}`,
        'color: #00ff00; font-weight: bold',
        'color: inherit',
        data || ''
      );
    }
  },

  /**
   * API Response log - only shows in debug mode
   */
  apiResponse: (url: string, status: number, data?: any) => {
    if (isDebugMode) {
      const color = status >= 200 && status < 300 ? '#00ff00' : '#ff0000';
      console.log(
        `%c[API RESPONSE ${status}]%c ${url}`,
        `color: ${color}; font-weight: bold`,
        'color: inherit',
        data || ''
      );
    }
  },

  /**
   * Group logging - only shows in debug mode
   */
  group: (label: string, callback: () => void) => {
    if (isDebugMode) {
      console.group(label);
      callback();
      console.groupEnd();
    }
  }
};

// Export individual functions for easier imports
export const { debug, info, warn, error, api, apiResponse, group } = logger;
