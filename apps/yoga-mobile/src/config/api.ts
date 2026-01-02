import { Platform } from "react-native";

// API Configuration
// For physical device testing, set your Mac's local IP here:
const LOCAL_IP = "192.168.4.116"; // Update this to your Mac's IP (run: ifconfig | grep inet)

const getDevUrl = () => {
  // Physical device - use local IP
  // To test on simulator instead, comment out the line below and uncomment the Platform check
  return `http://${LOCAL_IP}:3111`;

  // Uncomment for simulator/emulator testing:
  // if (Platform.OS === "android") {
  //   return "http://10.0.2.2:3111";
  // }
  // return "http://localhost:3111";
};

export const API_BASE_URL = __DEV__ ? getDevUrl() : "https://myyoga.guru"; // Production

// Mobile-specific endpoints that use JWT Bearer token auth
export const API_ENDPOINTS = {
  // Mobile auth endpoints (returns Cognito tokens)
  login: "/api/auth/mobile/login",
  refresh: "/api/auth/mobile/refresh",
  me: "/api/auth/mobile/me",
  // Web endpoints (for signup - not yet mobile-specific)
  signup: "/api/auth/cognito/signup",
};
