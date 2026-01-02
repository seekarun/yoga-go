import { API_BASE_URL, API_ENDPOINTS } from "../config/api";

export interface User {
  id: string;
  cognitoSub: string;
  email: string;
  name: string;
  role: string[];
  avatar?: string;
  expertProfile?: string;
}

// Mobile login response with Cognito tokens
export interface LoginResponse {
  success: boolean;
  message: string;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  user?: User;
}

// Token refresh response
export interface RefreshResponse {
  success: boolean;
  message: string;
  accessToken?: string;
  expiresIn?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Login with email and password
 * Returns Cognito access token and refresh token
 */
export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.login}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  return data;
}

/**
 * Refresh access token using refresh token
 */
export async function refreshToken(
  refreshTokenValue: string,
  accessToken: string,
): Promise<RefreshResponse> {
  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.refresh}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ refreshToken: refreshTokenValue }),
  });

  const data = await response.json();
  return data;
}

/**
 * Get current user using access token
 */
export async function getCurrentUser(
  accessToken: string,
): Promise<ApiResponse<User>> {
  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.me}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();
  return data;
}

export async function signup(
  email: string,
  password: string,
  name: string,
): Promise<{
  success: boolean;
  message: string;
  requiresVerification?: boolean;
}> {
  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.signup}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password, name }),
  });

  const data = await response.json();
  return data;
}
