import { API_BASE_URL, API_ENDPOINTS } from "../config/api";

export interface EmailAddress {
  name?: string;
  email: string;
}

export interface EmailAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface Email {
  id: string;
  messageId: string;
  threadId?: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  attachments: EmailAttachment[];
  receivedAt: string;
  isRead: boolean;
  isStarred: boolean;
  isOutgoing: boolean;
  status: "received" | "sent" | "failed";
  isDeleted?: boolean;
  isArchived?: boolean;
  labels?: string[];
  threadCount?: number;
  threadHasUnread?: boolean;
  threadLatestAt?: string;
}

export interface InboxResponse {
  success: boolean;
  data?: {
    emails: Email[];
    totalCount: number;
    unreadCount: number;
    lastKey?: string;
  };
  error?: string;
}

interface UpdateEmailResponse {
  success: boolean;
  error?: string;
}

/**
 * Fetch inbox emails
 */
export async function fetchInbox(
  accessToken: string,
  folder: "inbox" | "sent" | "trash" | "archive" = "inbox",
  limit = 20,
  lastKey?: string,
): Promise<InboxResponse> {
  const params = new URLSearchParams({ folder, limit: String(limit) });
  if (lastKey) params.set("lastKey", lastKey);

  const response = await fetch(
    `${API_BASE_URL}${API_ENDPOINTS.inbox}?${params}`,
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

/**
 * Mark an email as read/unread
 */
export async function markEmailRead(
  emailId: string,
  isRead: boolean,
  accessToken: string,
): Promise<UpdateEmailResponse> {
  const response = await fetch(
    `${API_BASE_URL}${API_ENDPOINTS.inbox}/${emailId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ isRead }),
    },
  );

  return response.json();
}

/**
 * Mark an email as starred/unstarred
 */
export async function toggleEmailStar(
  emailId: string,
  isStarred: boolean,
  accessToken: string,
): Promise<UpdateEmailResponse> {
  const response = await fetch(
    `${API_BASE_URL}${API_ENDPOINTS.inbox}/${emailId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ isStarred }),
    },
  );

  return response.json();
}

export type ComposeMode = "reply" | "reply-all" | "forward";

interface ReplyRequestBody {
  text: string;
  mode: ComposeMode;
  to?: EmailAddress[];
  cc?: EmailAddress[];
}

interface ReplyResponse {
  success: boolean;
  data?: Email;
  message?: string;
  error?: string;
}

/**
 * Send a reply, reply-all, or forward
 */
export async function replyToEmail(
  emailId: string,
  body: ReplyRequestBody,
  accessToken: string,
): Promise<ReplyResponse> {
  const response = await fetch(
    `${API_BASE_URL}${API_ENDPOINTS.inbox}/${emailId}/reply`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    },
  );

  return response.json();
}

/**
 * Delete (soft) an email
 */
export async function deleteEmail(
  emailId: string,
  accessToken: string,
): Promise<UpdateEmailResponse> {
  const response = await fetch(
    `${API_BASE_URL}${API_ENDPOINTS.inbox}/${emailId}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  return response.json();
}
