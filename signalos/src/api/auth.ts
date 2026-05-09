export interface User {
  id: string;
  name: string;
  phone: string;
  businessType: string;
  trustScore: number;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export async function login(phone: string, password: string): Promise<AuthResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL is not defined');
  }

  const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ phone, password }),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Login failed');
  }

  return res.json();
}

export async function signup(
  name: string,
  phone: string,
  password: string,
  businessType: string
): Promise<AuthResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL is not defined');
  }

  const res = await fetch(`${baseUrl}/api/v1/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, phone, password, businessType }),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Signup failed');
  }

  return res.json();
}

export async function logout(): Promise<{ success: boolean }> {
  // In a real app, you might want to call a logout endpoint to invalidate the token on the server
  // For now, we'll just return success and let the client handle token removal
  return { success: true };
}