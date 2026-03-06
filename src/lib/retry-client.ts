/**
 * Retry mechanism for frontend API calls
 * Implements exponential backoff with jitter
 */

export interface RetryConfig {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableStatusCodes?: number[];
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  onRetry: () => {},
};

export class RetryableError extends Error {
  public readonly isNetworkError: boolean;

  constructor(
    message: string,
    public statusCode?: number,
    public isRetryable: boolean = false,
    public readonly originalError?: Error,
  ) {
    super(message, { cause: originalError });
    this.name = 'RetryableError';
    this.isNetworkError =
      !statusCode ||
      statusCode === 0 ||
      (originalError?.message ?? '').toLowerCase().includes('fetch') ||
      (originalError?.message ?? '').toLowerCase().includes('network');
  }
}

/**
 * Delay with exponential backoff and jitter
 */
function calculateDelay(
  attempt: number,
  config: Required<RetryConfig>,
): number {
  const exponentialDelay =
    config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);

  // Add jitter (0-30% of delay) to prevent thundering herd
  const jitter = Math.random() * 0.3 * cappedDelay;

  return cappedDelay + jitter;
}

/**
 * Check if error is retryable
 */
function isRetryable(error: any, config: Required<RetryConfig>): boolean {
  // Network errors
  if (
    error.message?.includes('fetch') ||
    error.message?.includes('network') ||
    error.message?.includes('timeout')
  ) {
    return true;
  }

  // Specific retryable status codes
  if (error.statusCode && config.retryableStatusCodes.includes(error.statusCode)) {
    return true;
  }

  // Server busy or overloaded
  if (error.statusCode === 503 || error.statusCode === 429) {
    return true;
  }

  return false;
}

/**
 * Execute function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {},
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry if it's the last attempt
      if (attempt === finalConfig.maxAttempts) {
        const isNetwork =
          !error.statusCode ||
          error.statusCode === 0 ||
          error.message?.toLowerCase().includes('fetch') ||
          error.message?.toLowerCase().includes('network');
        const userMessage = isNetwork
          ? `Koneksi ke server gagal setelah ${attempt} percobaan. Pastikan koneksi internet Anda stabil dan coba lagi.`
          : `Gagal setelah ${attempt} percobaan: ${error.message}`;
        throw new RetryableError(
          userMessage,
          error.statusCode,
          false,
          error instanceof Error ? error : new Error(String(error)),
        );
      }

      // Check if error is retryable
      if (!isRetryable(error, finalConfig)) {
        throw error;
      }

      // Calculate delay and wait
      const delay = calculateDelay(attempt, finalConfig);

      // Notify retry callback
      if (finalConfig.onRetry) {
        finalConfig.onRetry(attempt, error);
      }

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Retry wrapper with circuit breaker pattern
 */
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime: number | null = null;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000, // 1 minute
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (
        this.lastFailureTime &&
        Date.now() - this.lastFailureTime > this.timeout
      ) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN. Service unavailable.');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
    }
  }

  getState() {
    return this.state;
  }

  reset() {
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED';
  }
}
