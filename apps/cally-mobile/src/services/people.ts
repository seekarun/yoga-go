import { API_BASE_URL, API_ENDPOINTS } from "../config/api";

// --- Types ---

export type UserType = "registered" | "visitor" | "contact";

export interface CallyUser {
  email: string;
  name: string;
  userType: UserType;
  avatar?: string;
  subscribedAt?: string;
  source?: string;
  lastBookingDate?: string;
  lastBookingStatus?: string;
  totalBookings?: number;
  lastContactDate?: string;
  totalContacts?: number;
  anonymous?: boolean;
  visitorInfo?: {
    country?: string;
    city?: string;
  };
}

export interface UserEmail {
  id: string;
  subject: string;
  bodyText: string;
  receivedAt: string;
  isOutgoing: boolean;
}

export interface UserBooking {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: string;
}

export interface UserContact {
  id: string;
  message: string;
  submittedAt: string;
}

export interface UserFeedback {
  id: string;
  status: "pending" | "submitted";
  createdAt: string;
  submittedAt?: string;
  rating?: number;
  message?: string;
  approved?: boolean;
}

export interface UserFileData {
  user: CallyUser;
  communications: UserEmail[];
  bookings: UserBooking[];
  contacts: UserContact[];
  feedbackRequests: UserFeedback[];
}

interface UsersResponse {
  success: boolean;
  data?: CallyUser[];
  error?: string;
}

interface UserDetailResponse {
  success: boolean;
  data?: UserFileData;
  error?: string;
}

// --- API Functions ---

export async function fetchUsers(accessToken: string): Promise<UsersResponse> {
  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.subscribers}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return response.json();
}

export async function fetchUserDetail(
  userEmail: string,
  accessToken: string,
): Promise<UserDetailResponse> {
  const response = await fetch(
    `${API_BASE_URL}${API_ENDPOINTS.users}/${encodeURIComponent(userEmail)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  return response.json();
}
