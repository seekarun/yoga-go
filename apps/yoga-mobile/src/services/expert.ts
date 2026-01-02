import { API_BASE_URL } from "../config/api";

// Expert profile type (subset of full Expert type from backend)
export interface ExpertProfile {
  id: string;
  name: string;
  title: string;
  bio: string;
  avatar?: string;
  profilePic?: string;
  totalCourses: number;
  totalStudents: number;
  rating: number;
  specializations: string[];
}

// Wallet type for earnings
export interface ExpertWallet {
  id: string;
  expertId: string;
  balance: number;
  currency: string;
  totalDeposited: number;
  totalSpent: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Dashboard stats derived from expert and wallet data
export interface DashboardStats {
  totalStudents: number;
  totalCourses: number;
  walletBalance: number;
  currency: string;
  rating: number;
}

/**
 * Get current expert's profile
 */
export async function getExpertProfile(
  accessToken: string,
): Promise<ApiResponse<ExpertProfile>> {
  console.log("[DBG][expert.ts] Fetching expert profile");

  const response = await fetch(`${API_BASE_URL}/data/app/expert/me`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();
  console.log("[DBG][expert.ts] Expert profile response:", data.success);
  return data;
}

/**
 * Get current expert's wallet
 */
export async function getExpertWallet(
  accessToken: string,
): Promise<ApiResponse<ExpertWallet>> {
  console.log("[DBG][expert.ts] Fetching expert wallet");

  const response = await fetch(`${API_BASE_URL}/data/app/expert/me/wallet`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();
  console.log("[DBG][expert.ts] Wallet response:", data.success);
  return data;
}

/**
 * Get dashboard stats by fetching expert profile and wallet
 */
export async function getDashboardStats(
  accessToken: string,
): Promise<ApiResponse<DashboardStats>> {
  console.log("[DBG][expert.ts] Fetching dashboard stats");

  try {
    // Fetch expert profile and wallet in parallel
    const [profileResponse, walletResponse] = await Promise.all([
      getExpertProfile(accessToken),
      getExpertWallet(accessToken),
    ]);

    if (!profileResponse.success || !profileResponse.data) {
      return {
        success: false,
        error: profileResponse.error || "Failed to fetch expert profile",
      };
    }

    const stats: DashboardStats = {
      totalStudents: profileResponse.data.totalStudents || 0,
      totalCourses: profileResponse.data.totalCourses || 0,
      walletBalance: walletResponse.data?.balance || 0,
      currency: walletResponse.data?.currency || "USD",
      rating: profileResponse.data.rating || 0,
    };

    console.log("[DBG][expert.ts] Dashboard stats:", stats);
    return { success: true, data: stats };
  } catch (error) {
    console.error("[DBG][expert.ts] Error fetching dashboard stats:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch stats",
    };
  }
}
