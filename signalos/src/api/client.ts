/**
 * Centralized API Client
 *
 * Production-grade HTTP client with:
 * - Automatic token injection
 * - Centralized error handling
 * - 401 auto-logout with token clearing
 * - Request/response interceptors
 * - Reusable across entire app
 */

import type { ApiError, ApiResponse } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error('NEXT_PUBLIC_API_BASE_URL is not defined in environment variables');
}

/**
 * Custom event for cross-component auth invalidation
 */
export const AUTH_INVALIDATED = 'auth:invalidated';

/**
 * Dispatch event to notify all components of auth invalidation
 */
function dispatchAuthInvalidated(): void {
  window.dispatchEvent(new Event(AUTH_INVALIDATED));
}

/**
 * Parse error response from API
 */
function parseApiError(response: Response): ApiError {
  const statusCode = response.status;
  const error: ApiError = {
    statusCode,
    message: 'An unexpected error occurred',
    error: 'Unknown error',
  };

  // Try to parse JSON error body
  response.json?.().then((data) => {
    if (data?.message) error.message = data.message;
    if (data?.error) error.error = data.error;
  }).catch(() => {
    // Ignore JSON parse errors
  });

  return error;
}

/**
 * Handle authentication errors globally
 * Clears stored token, logs out user, redirects to login
 */
async function handleAuthError(): Promise<never> {
  // Clear localStorage/session tokens
  localStorage.removeItem('signal-auth');
  sessionStorage.removeItem('signal-auth');

  // Dispatch event to notify auth store
  dispatchAuthInvalidated();

  // Use Next.js router for redirect (client-side only)
  if (typeof window !== 'undefined') {
    // Small delay to prevent race conditions
    setTimeout(() => {
      window.location.href = '/login';
    }, 100);
  }

  throw new Error('Authentication required. Redirecting to login...');
}

/**
 * Generic request wrapper with error handling
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;

  // Get token from localStorage for SSR compatibility during hydration
  let token: string | null = null;
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('signal-auth');
      if (stored) {
        const authData = JSON.parse(stored);
        token = authData.accessToken ?? null;
      }
    } catch (error) {
      console.error('Failed to parse auth token:', error);
    }
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Inject Authorization header if token exists
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle 401/403 - invalid/expired token
    if (response.status === 401 || response.status === 403) {
      await handleAuthError();
    }

    // Handle non-2xx responses (excluding 401 above)
    if (!response.ok) {
      const apiError = parseApiError(response);
      return {
        success: false,
        error: apiError,
      };
    }

    // Parse successful response
    // 204 No Content
    if (response.status === 204) {
      return { success: true };
    }

    const data = await response.json();
    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('API request failed:', error);
    return {
      success: false,
      error: {
        statusCode: 0,
        message: error instanceof Error ? error.message : 'Network error',
        error: 'NETWORK_ERROR',
      },
    };
  }
}

/**
 * API Client with method shortcuts
 */
export const api = {
  /**
   * GET request
   */
  get<T>(endpoint: string, options?: RequestInit) {
    return request<T>(endpoint, { ...options, method: 'GET' });
  },

  /**
   * POST request
   */
  post<T>(endpoint: string, body?: unknown, options?: RequestInit) {
    return request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  /**
   * PUT request
   */
  put<T>(endpoint: string, body?: unknown, options?: RequestInit) {
    return request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  /**
   * PATCH request
   */
  patch<T>(endpoint: string, body?: unknown, options?: RequestInit) {
    return request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  /**
   * DELETE request
   */
  delete<T>(endpoint: string, options?: RequestInit) {
    return request<T>(endpoint, { ...options, method: 'DELETE' });
  },
};

export default api;
