// Centralized TypeScript types for the entire application

/**
 * Business type enumeration matching backend enum
 */
export enum BusinessType {
  TRADER = 'TRADER',
  SERVICE_PROVIDER = 'SERVICE_PROVIDER',
  MANUFACTURER = 'MANUFACTURER',
  AGGREGATOR = 'AGGREGATOR',
  FARMER = 'FARMER',
  RETAILER = 'RETAILER',
  WHOLER = 'WHOLER',
}

/**
 * User profile data returned by GET /api/v1/users/me
 */
export interface User {
  id: string;
  name: string;
  phone: string;
  businessType: BusinessType;
  trustScore: number;
  createdAt: string; // ISO 8601 date string
}

/**
 * Authentication response from login/signup
 */
export interface AuthResponse {
  user: User;
  accessToken: string;
}

/**
 * Generic API error response structure
 */
export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

/**
 * Standardized API response wrapper
 */
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: ApiError;
  success: boolean;
}

/**
 * Auth state stored in Zustand
 */
export interface AuthState {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, phone: string, password: string, businessType: BusinessType) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  clearAuth: () => void;
  hydrate: () => Promise<void>;
}

/**
 * Onboarding state (separate from auth)
 */
export interface OnboardingState {
  step: number;
  completed: boolean;
  // ... other onboarding fields
}

/**
 * Base API client configuration options
 */
export interface ApiClientConfig {
  baseUrl: string;
  token?: string | null;
}
