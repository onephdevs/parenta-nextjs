import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind CSS classes
 * Combines clsx for conditional classes and tailwind-merge for deduplication
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format date to readable string.
 * Date-only values (YYYY-MM-DD) are parsed at noon local time to avoid UTC day shifts.
 */
export function formatDate(date: Date | string): string {
  const d =
    typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())
      ? new Date(`${date.trim()}T12:00:00`)
      : new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Format date with time
 */
export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Capitalize first letter of string
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Generate a random ID
 */
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Sleep function for async operations
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parse date from various formats
 */
export function parseDate(date: Date | string | undefined): Date | undefined {
  if (!date) return undefined;
  if (date instanceof Date) return date;
  return new Date(date);
}

/**
 * Format date for database storage (YYYY-MM-DD)
 */
export function formatDateForDatabase(date: Date | string): string {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
} 