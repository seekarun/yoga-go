"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import DOMPurify from "dompurify";
import type { EmailAttachment, EmailWithThread, Email } from "@/types";
import EmailComposer, {
  type ComposerMode,
} from "@/components/inbox/EmailComposer";

interface ReplyAttachment {
  file: File;
  uploading: boolean;
  uploaded: boolean;
  s3Key?: string;
  attachmentId?: string;
}

const MAX_ATTACHMENTS = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function EmailDetailPage() {
  const params = useParams();
  const router = useRouter();
  const expertId = params.expertId as string;
  const emailId = params.emailId as string;

  const [email, setEmail] = useState<EmailWithThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReply, setShowReply] = useState(false);
  const [replyMode, setReplyMode] = useState<ComposerMode>("reply");
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [replyAttachments, setReplyAttachments] = useState<ReplyAttachment[]>(
    [],
  );
  const [showComposer, setShowComposer] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchEmail = useCallback(async () => {
    try {
      setLoading(true);
      console.log("[DBG][email-detail] Fetching email:", emailId);

      const response = await fetch(`/api/data/app/inbox/${emailId}`);
      const data = await response.json();

      if (data.success && data.data) {
        setEmail(data.data);
        // Mark as read
        if (!data.data.isRead) {
          fetch(`/api/data/app/inbox/${emailId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isRead: true }),
          });
        }
      } else {
        setError(data.error || "Failed to load email");
      }
    } catch (err) {
      console.error("[DBG][email-detail] Error:", err);
      setError("Failed to load email");
    } finally {
      setLoading(false);
    }
  }, [emailId]);

  useEffect(() => {
    fetchEmail();
  }, [fetchEmail]);

  const handleDownloadAttachment = async (attachment: EmailAttachment) => {
    try {
      const response = await fetch(
        `/api/data/app/inbox/${emailId}/attachments/${attachment.id}`,
      );
      const data = await response.json();
      if (data.success && data.data?.downloadUrl) {
        window.open(data.data.downloadUrl, "_blank");
      } else {
        alert("Failed to get download link");
      }
    } catch (err) {
      console.error("[DBG][email-detail] Download error:", err);
      alert("Failed to download attachment");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this email?")) {
      return;
    }
    try {
      const response = await fetch(`/api/data/app/inbox/${emailId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (data.success) {
        router.push(`/srv/${expertId}/inbox`);
      } else {
        alert(data.error || "Failed to delete email");
      }
    } catch (err) {
      console.error("[DBG][email-detail] Delete error:", err);
      alert("Failed to delete email");
    }
  };

  const handleAddFiles = (files: FileList | null) => {
    if (!files) return;
    const newFiles: ReplyAttachment[] = [];
    const currentCount = replyAttachments.length;

    for (let i = 0; i < files.length; i++) {
      if (currentCount + newFiles.length >= MAX_ATTACHMENTS) {
        alert(`Maximum ${MAX_ATTACHMENTS} attachments allowed`);
        break;
      }
      const file = files[i];
      if (file.size > MAX_FILE_SIZE) {
        alert(`${file.name} exceeds 10MB limit`);
        continue;
      }
      newFiles.push({ file, uploading: false, uploaded: false });
    }

    setReplyAttachments((prev) => [...prev, ...newFiles]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setReplyAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadAttachment = async (
    att: ReplyAttachment,
  ): Promise<{ s3Key: string; attachmentId: string } | null> => {
    try {
      const res = await fetch("/api/data/app/inbox/attachments/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: att.file.name,
          contentType: att.file.type || "application/octet-stream",
          size: att.file.size,
        }),
      });
      const data = await res.json();
      if (!data.success) return null;

      const uploadRes = await fetch(data.data.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": att.file.type || "application/octet-stream",
        },
        body: att.file,
      });

      if (!uploadRes.ok) return null;
      return { s3Key: data.data.s3Key, attachmentId: data.data.attachmentId };
    } catch (err) {
      console.error("[DBG][email-detail] Upload error:", err);
      return null;
    }
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;

    try {
      setReplySending(true);
      setReplyError(null);

      const uploadedAttachments: Array<{
        filename: string;
        contentType: string;
        size: number;
        s3Key: string;
        attachmentId: string;
      }> = [];

      if (replyAttachments.length > 0) {
        setReplyAttachments((prev) =>
          prev.map((a) => ({ ...a, uploading: true })),
        );

        for (const att of replyAttachments) {
          const result = await uploadAttachment(att);
          if (!result) {
            setReplyError(`Failed to upload ${att.file.name}`);
            setReplyAttachments((prev) =>
              prev.map((a) => ({ ...a, uploading: false })),
            );
            setReplySending(false);
            return;
          }
          uploadedAttachments.push({
            filename: att.file.name,
            contentType: att.file.type || "application/octet-stream",
            size: att.file.size,
            s3Key: result.s3Key,
            attachmentId: result.attachmentId,
          });
        }

        setReplyAttachments((prev) =>
          prev.map((a) => ({ ...a, uploading: false, uploaded: true })),
        );
      }

      const response = await fetch(`/api/data/app/inbox/${emailId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: replyText,
          attachments:
            uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
        }),
      });
      const data = await response.json();

      if (data.success) {
        setReplyText("");
        setReplyAttachments([]);
        setShowReply(false);
        await fetchEmail();
      } else {
        setReplyError(data.error || "Failed to send reply");
      }
    } catch (err) {
      console.error("[DBG][email-detail] Reply error:", err);
      setReplyError("Failed to send reply");
    } finally {
      setReplySending(false);
    }
  };

  const openComposer = (mode: ComposerMode) => {
    setReplyMode(mode);
    setShowComposer(true);
    setShowReply(false);
  };

  const getComposerInitialData = () => {
    if (!email) return {};

    const lastIncoming = email.threadMessages?.length
      ? [...email.threadMessages].reverse().find((m) => !m.isOutgoing)
      : undefined;
    const replyTo = lastIncoming || email;

    switch (replyMode) {
      case "reply":
        return {
          initialTo: [replyTo.from],
          initialSubject: email.subject.startsWith("Re: ")
            ? email.subject
            : `Re: ${email.subject}`,
        };
      case "reply-all": {
        const allRecipients = [...(replyTo.to || []), ...(replyTo.cc || [])];
        return {
          initialTo: [replyTo.from],
          initialCc: allRecipients.length > 0 ? allRecipients : undefined,
          initialSubject: email.subject.startsWith("Re: ")
            ? email.subject
            : `Re: ${email.subject}`,
        };
      }
      case "forward":
        return {
          initialSubject: email.subject.startsWith("Fwd: ")
            ? email.subject
            : `Fwd: ${email.subject}`,
          initialBody: `\n\n---------- Forwarded message ----------\nFrom: ${email.from.name || ""} <${email.from.email}>\nDate: ${email.receivedAt}\nSubject: ${email.subject}\n\n${email.bodyText}`,
        };
      default:
        return {};
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString([], {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const renderRecipients = (msg: Email) => {
    return (
      <div className="text-xs text-gray-500 mt-0.5">
        {msg.cc && msg.cc.length > 0 && (
          <span>CC: {msg.cc.map((a) => a.name || a.email).join(", ")}</span>
        )}
        {msg.bcc && msg.bcc.length > 0 && (
          <span className="ml-2">
            BCC: {msg.bcc.map((a) => a.name || a.email).join(", ")}
          </span>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]" />
        <span className="ml-3 text-gray-600">Loading email...</span>
      </div>
    );
  }

  if (error || !email) {
    return (
      <div className="px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700">{error || "Email not found"}</p>
          <Link
            href={`/srv/${expertId}/inbox`}
            className="inline-block mt-4 text-sm text-[var(--color-primary)] hover:underline"
          >
            Back to Inbox
          </Link>
        </div>
      </div>
    );
  }

  // Show full composer overlay for reply-all/forward
  if (showComposer) {
    const composerData = getComposerInitialData();
    return (
      <div className="px-6 lg:px-8 py-6">
        <EmailComposer
          mode={replyMode}
          originalEmailId={emailId}
          initialTo={composerData.initialTo}
          initialCc={composerData.initialCc}
          initialSubject={composerData.initialSubject}
          initialBody={composerData.initialBody}
          onSent={() => {
            setShowComposer(false);
            fetchEmail();
          }}
          onCancel={() => setShowComposer(false)}
        />
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <Link
                href={`/srv/${expertId}/inbox`}
                className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg flex-shrink-0"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </Link>
              <h1 className="text-lg font-semibold text-gray-900 truncate">
                {email.subject || "(no subject)"}
              </h1>
            </div>
            <button
              onClick={handleDelete}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
              title="Delete email"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow">
          {/* Thread Messages or Single Email */}
          {email.threadMessages && email.threadMessages.length > 1 ? (
            <div className="divide-y divide-gray-100">
              {email.threadMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-6 ${msg.isOutgoing ? "bg-blue-50/50" : ""}`}
                >
                  {/* Message Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          msg.isOutgoing ? "bg-blue-200" : "bg-gray-200"
                        }`}
                      >
                        <span
                          className={`text-lg font-semibold ${
                            msg.isOutgoing ? "text-blue-600" : "text-gray-600"
                          }`}
                        >
                          {(msg.from.name || msg.from.email)[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {msg.isOutgoing ? (
                            <span className="text-blue-600">You</span>
                          ) : (
                            msg.from.name || msg.from.email
                          )}
                          {msg.isOutgoing && (
                            <span className="text-gray-500 font-normal">
                              {" "}
                              to {msg.to[0]?.name || msg.to[0]?.email}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(msg.receivedAt)}
                        </p>
                        {renderRecipients(msg)}
                      </div>
                    </div>
                    {msg.isOutgoing && (
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded">
                        Sent
                      </span>
                    )}
                  </div>

                  {/* Message Body */}
                  <div className="ml-13">
                    {msg.bodyHtml ? (
                      <div
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(msg.bodyHtml, {
                            ADD_TAGS: ["style"],
                            ADD_ATTR: ["target"],
                          }),
                        }}
                      />
                    ) : (
                      <div className="whitespace-pre-wrap text-gray-700">
                        {msg.bodyText}
                      </div>
                    )}
                  </div>

                  {/* Attachments */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-4 ml-13">
                      <div className="flex flex-wrap gap-2">
                        {msg.attachments.map((attachment) => (
                          <button
                            key={attachment.id}
                            onClick={() => handleDownloadAttachment(attachment)}
                            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left text-sm"
                          >
                            <svg
                              className="w-4 h-4 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                              />
                            </svg>
                            <span className="truncate max-w-32">
                              {attachment.filename}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Single email view */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-lg font-semibold text-gray-600">
                          {(email.from.name ||
                            email.from.email)[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {email.isOutgoing ? (
                            <>To: {email.to[0]?.name || email.to[0]?.email}</>
                          ) : (
                            email.from.name || email.from.email
                          )}
                        </p>
                        <p className="text-sm text-gray-500">
                          {email.isOutgoing
                            ? `From: ${email.from.email}`
                            : email.from.email}
                        </p>
                        {renderRecipients(email)}
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      {formatDate(email.receivedAt)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Email Body */}
              <div className="p-6">
                {email.bodyHtml ? (
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(email.bodyHtml, {
                        ADD_TAGS: ["style"],
                        ADD_ATTR: ["target"],
                      }),
                    }}
                  />
                ) : (
                  <div className="whitespace-pre-wrap text-gray-700">
                    {email.bodyText}
                  </div>
                )}
              </div>

              {/* Attachments */}
              {email.attachments && email.attachments.length > 0 && (
                <div className="px-6 pb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    Attachments ({email.attachments.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {email.attachments.map((attachment) => (
                      <button
                        key={attachment.id}
                        onClick={() => handleDownloadAttachment(attachment)}
                        className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <svg
                            className="w-5 h-5 text-gray-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {attachment.filename}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(attachment.size)}
                          </p>
                        </div>
                        <svg
                          className="w-4 h-4 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Reply Action Buttons */}
        <div className="mt-4">
          {!showReply ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setShowReply(true);
                  setReplyMode("reply");
                }}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                  />
                </svg>
                Reply
              </button>
              <button
                onClick={() => openComposer("reply-all")}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                  />
                </svg>
                Reply All
              </button>
              <button
                onClick={() => openComposer("forward")}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
                Forward
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 mb-3">
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                  />
                </svg>
                <span className="text-sm text-gray-500">
                  Replying to{" "}
                  <strong className="text-gray-700">
                    {(() => {
                      const replyTo = email.threadMessages?.length
                        ? (() => {
                            const lastIncoming = [...email.threadMessages]
                              .reverse()
                              .find((m) => !m.isOutgoing);
                            return lastIncoming?.from || email.from;
                          })()
                        : email.from;
                      return replyTo.name || replyTo.email;
                    })()}
                  </strong>
                </span>
              </div>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your reply..."
                rows={5}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-y"
                disabled={replySending}
              />

              {/* Attachment chips */}
              {replyAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {replyAttachments.map((att, idx) => (
                    <div
                      key={`${att.file.name}-${idx}`}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-100 rounded-lg text-xs"
                    >
                      <svg
                        className="w-3.5 h-3.5 text-gray-400 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                        />
                      </svg>
                      <span className="truncate max-w-[120px] text-gray-700">
                        {att.file.name}
                      </span>
                      <span className="text-gray-400">
                        ({formatFileSize(att.file.size)})
                      </span>
                      {att.uploading && (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-500" />
                      )}
                      {!replySending && (
                        <button
                          onClick={() => handleRemoveAttachment(idx)}
                          className="ml-0.5 text-gray-400 hover:text-red-500 transition-colors"
                          type="button"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {replyError && (
                <p className="text-sm text-red-600 mt-2">{replyError}</p>
              )}
              <div className="flex items-center justify-between mt-3">
                {/* Attach file button */}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => handleAddFiles(e.target.files)}
                    disabled={
                      replySending || replyAttachments.length >= MAX_ATTACHMENTS
                    }
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={
                      replySending || replyAttachments.length >= MAX_ATTACHMENTS
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    type="button"
                    title={`Attach files (max ${MAX_ATTACHMENTS}, 10MB each)`}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                      />
                    </svg>
                    Attach
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowReply(false);
                      setReplyText("");
                      setReplyError(null);
                      setReplyAttachments([]);
                    }}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                    disabled={replySending}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReply}
                    disabled={replySending || !replyText.trim()}
                    className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {replySending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                          />
                        </svg>
                        Send Reply
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
