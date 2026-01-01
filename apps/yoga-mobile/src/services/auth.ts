import { API_BASE_URL, API_ENDPOINTS } from "../config/api";

export interface User {
  id: string;
  email: string;
  name: string;
  role: string[];
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user?: User;
  redirectUrl?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

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

export async function getCurrentUser(
  token: string,
): Promise<ApiResponse<User>> {
  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.me}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Cookie: `authjs.session-token=${token}`,
    },
  });

  const data = await response.json();
  return data;
}
