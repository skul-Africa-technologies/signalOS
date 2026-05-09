/**
 * Authentication Service Layer
 *
 * Centralized API functions for auth operations.
 * All methods use the centralized api client with automatic token injection.
 */

import api from './client'
import type { User, AuthResponse, BusinessType } from '@/types'

const AUTH_ENDPOINT = '/api/v1/auth'
const USERS_ENDPOINT = '/api/v1/users'

/**
 * Login with phone and password
 */
export async function login(phone: string, password: string): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>(`${AUTH_ENDPOINT}/login`, {
    phone,
    password,
  })

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Login failed')
  }

  return response.data
}

/**
 * Sign up new user
 */
export async function signup(
  name: string,
  phone: string,
  password: string,
  businessType: BusinessType
): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>(`${AUTH_ENDPOINT}/signup`, {
    name,
    phone,
    password,
    businessType,
  })

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Signup failed')
  }

  return response.data
}

/**
 * Get the currently authenticated user profile
 * GET /api/v1/users/me
 */
export async function getCurrentUser(): Promise<User> {
  const response = await api.get<User>(`${USERS_ENDPOINT}/me`)

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to fetch user profile')
  }

  return response.data
}

/**
 * Update current user profile
 * PATCH /api/v1/users/me
 */
export async function updateUser(updates: Partial<Pick<User, 'name' | 'businessType'>>): Promise<User> {
  const response = await api.patch<User>(`${USERS_ENDPOINT}/me`, updates)

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to update profile')
  }

  return response.data
}

/**
 * Logout - token is cleared on client, server-side invalidation optional
 * POST /api/v1/auth/logout
 */
export async function logout(): Promise<{ success: boolean }> {
  try {
    const response = await api.post<{ success: boolean }>(`${AUTH_ENDPOINT}/logout`)
    return response.data || { success: true }
  } catch {
    return { success: true }
  }
}
