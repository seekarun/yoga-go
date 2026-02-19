import { Platform } from "react-native";

// API Configuration
// For physical device testing, set your Mac's local IP here:
const LOCAL_IP = "192.168.4.116"; // Update this to your Mac's IP (run: ifconfig | grep inet)

const getDevUrl = () => {
  // Android emulator: 10.0.2.2 maps to host machine's localhost
  if (Platform.OS === "android") {
    return "http://10.0.2.2:3113";
  }
  // iOS simulator: localhost works directly
  return "http://localhost:3113";

  // For physical device testing, uncomment and use local IP:
  // return `http://${LOCAL_IP}:3113`;
};

export const API_BASE_URL = __DEV__ ? getDevUrl() : "https://cally.app";

// Mobile-specific endpoints that use JWT Bearer token auth
export const API_ENDPOINTS = {
  // Mobile auth endpoints
  login: "/api/auth/mobile/login",
  googleCallback: "/api/auth/mobile/google/callback",
  refresh: "/api/auth/mobile/refresh",
  me: "/api/auth/mobile/me",
  // App data endpoints (use Bearer token)
  chat: "/api/data/app/ai/chat",
  calendar: "/api/data/app/calendar",
};
