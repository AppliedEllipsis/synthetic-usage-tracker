/**
 * API key utility functions
 * Provides secure formatting and validation for API keys
 */

/**
 * Format API key to show only the last 6 characters
 *
 * Design decision: Only show the last 6 characters of API keys in UI elements to prevent
 * full key exposure while allowing users to identify which key is currently configured.
 * This is a security best practice - displaying the full key in tooltips or status bars
 * could expose it to shoulder surfing, screen sharing, or screenshots.
 *
 * Alternative considered: Show first 4 and last 4 characters (e.g., "syn_...xxxx")
 * Rejected: The task specifically requires showing only the last 6 characters with "..." prefix,
 * which provides sufficient identification while maintaining maximum security.
 *
 * @param apiKey - The full API key string
 * @returns Formatted string with "..." followed by the last 6 characters
 */
export function formatApiKeySuffix(apiKey: string): string {
  // Handle null/undefined/empty strings
  if (!apiKey || apiKey.length === 0) {
    return "...";
  }

  // Handle short keys (< 6 characters) - show the entire key with "..." prefix
  if (apiKey.length < 6) {
    return `...${apiKey}`;
  }

  // Return "..." followed by the last 6 characters
  return `...${apiKey.substring(apiKey.length - 6)}`;
}
