/**
 * Publishing reliability service
 * Backend Reliability: Idempotency keys and intelligent retry logic
 */

import { ScheduledPost } from '../data/models';

export type ErrorType = 'transient' | 'permanent' | 'unknown';

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number; // milliseconds
  maxDelay: number;
  backoffMultiplier: number;
}

const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

export class PublishingReliability {
  private readonly retryConfig: RetryConfig;

  constructor(retryConfig?: Partial<RetryConfig>) {
    this.retryConfig = { ...defaultRetryConfig, ...retryConfig };
  }

  /**
   * Generate a deterministic idempotency key for a post
   * Prevents duplicate posts if network stutters
   * Uses stable properties to ensure same operation generates same key
   */
  generateIdempotencyKey(scheduledPost: ScheduledPost): string {
    const timestamp = new Date(scheduledPost.scheduledFor).getTime();
    return `${scheduledPost.accountId}-${scheduledPost.postDraftId}-${timestamp}`;
  }

  /**
   * Classify error type to determine retry strategy
   */
  classifyError(error: Error | string): ErrorType {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorLower = errorMessage.toLowerCase();

    // Transient errors - should retry
    const transientPatterns = [
      'timeout',
      'network',
      'econnreset',
      'enotfound',
      'rate limit',
      '429',
      '500',
      '502',
      '503',
      '504',
      'temporarily unavailable',
    ];

    if (transientPatterns.some(pattern => errorLower.includes(pattern))) {
      return 'transient';
    }

    // Permanent errors - should not retry
    const permanentPatterns = [
      'unauthorized',
      '401',
      'forbidden',
      '403',
      'not found',
      '404',
      'invalid token',
      'expired token',
      'invalid credentials',
      'duplicate',
      'already exists',
    ];

    if (permanentPatterns.some(pattern => errorLower.includes(pattern))) {
      return 'permanent';
    }

    return 'unknown';
  }

  /**
   * Determine if a post should be retried based on error and retry count
   */
  shouldRetry(scheduledPost: ScheduledPost, error: Error | string): boolean {
    const errorType = this.classifyError(error);
    const retryCount = scheduledPost.retryCount || 0;

    // Don't retry permanent errors
    if (errorType === 'permanent') {
      return false;
    }

    // Don't retry if max retries exceeded
    if (retryCount >= this.retryConfig.maxRetries) {
      return false;
    }

    // Retry transient errors and unknown errors (conservative approach)
    return errorType === 'transient' || errorType === 'unknown';
  }

  /**
   * Calculate delay before next retry using exponential backoff
   */
  calculateRetryDelay(retryCount: number): number {
    const delay = Math.min(
      this.retryConfig.initialDelay * Math.pow(this.retryConfig.backoffMultiplier, retryCount),
      this.retryConfig.maxDelay
    );
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    return Math.floor(delay + jitter);
  }

  /**
   * Execute a publishing function with retry logic
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    scheduledPost: ScheduledPost,
    onRetry?: (retryCount: number, error: Error) => void
  ): Promise<T> {
    let lastError: Error | null = null;
    let retryCount = scheduledPost.retryCount || 0;

    // If this post has already reached or exceeded the maximum retries, fail fast
    if (retryCount >= this.retryConfig.maxRetries) {
      throw new Error('Max retries exceeded');
    }

    while (retryCount < this.retryConfig.maxRetries) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (!this.shouldRetry(scheduledPost, lastError)) {
          throw lastError;
        }

        retryCount++;
        
        if (onRetry) {
          onRetry(retryCount, lastError);
        }

        if (retryCount < this.retryConfig.maxRetries) {
          const delay = this.calculateRetryDelay(retryCount);
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Sleep for a specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get user-friendly error message based on error type
   */
  getUserErrorMessage(error: Error | string): string {
    const errorType = this.classifyError(error);
    
    switch (errorType) {
      case 'transient':
        return 'A temporary network issue occurred. We will retry automatically.';
      case 'permanent':
        return 'This post cannot be published. Please check your credentials or content.';
      default:
        return 'An unexpected error occurred. We will attempt to retry.';
    }
  }
}
