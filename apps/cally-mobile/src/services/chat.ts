import { API_BASE_URL, API_ENDPOINTS } from "../config/api";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface ChatResponse {
  success: boolean;
  data?: {
    message: ChatMessage;
  };
  error?: string;
}

/**
 * Send a chat message to the AI assistant
 */
export async function sendChatMessage(
  message: string,
  sessionMessages: ChatMessage[],
  accessToken: string,
): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.chat}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ message, sessionMessages }),
  });

  const data = await response.json();
  return data;
}
