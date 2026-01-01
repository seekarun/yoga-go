// API Configuration
// Update this to your actual API URL
export const API_BASE_URL = __DEV__
  ? "http://localhost:3111" // Development - use local server
  : "https://myyoga.guru"; // Production

export const API_ENDPOINTS = {
  login: "/api/auth/cognito/login",
  signup: "/api/auth/cognito/signup",
  me: "/api/auth/me",
  logout: "/api/auth/logout",
};
