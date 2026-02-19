"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { EmailAddress, EmailDraft, EmailSignatureConfig } from "@/types";
import type { CallyUser } from "@/types";
import EmailChipInput from "@/components/inbox/EmailChipInput";
import { useContacts } from "@/hooks/useContacts";

interface ReplyAttachment {
  file: File;
  uploading: boolean;
  uploaded: boolean;
  s3Key?: string;
  attachmentId?: string;
}

const MAX_ATTACHMENTS = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const AUTO_SAVE_DELAY = 30000; // 30s

export type ComposerMode = "compose" | "reply" | "reply-all" | "forward";

interface EmailComposerProps {
  mode: ComposerMode;
  initialTo?: EmailAddress[];
  initialCc?: EmailAddress[];
  initialBcc?: EmailAddress[];
  initialSubject?: string;
  initialBody?: string;
  originalEmailId?: string;
  draftId?: string;
  onSent?: () => void;
  onCancel?: () => void;
  onDraftSaved?: (draftId: string) => void;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function EmailComposer({
  mode,
  initialTo = [],
  initialCc = [],
  initialBcc = [],
  initialSubject = "",
  initialBody = "",
  originalEmailId,
  draftId: existingDraftId,
  onSent,
  onCancel,
  onDraftSaved,
}: EmailComposerProps) {
  const [to, setTo] = useState<EmailAddress[]>(initialTo);
  const [cc, setCc] = useState<EmailAddress[]>(initialCc);
  const [bcc, setBcc] = useState<EmailAddress[]>(initialBcc);
  const [showCcBcc, setShowCcBcc] = useState(
    initialCc.length > 0 || initialBcc.length > 0,
  );
  const [subject, setSubject] = useState(initialSubject);
  const [bodyText, setBodyText] = useState(initialBody);
  const [attachments, setAttachments] = useState<ReplyAttachment[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | undefined>(existingDraftId);
  const [savingDraft, setSavingDraft] = useState(false);
  const [signature, setSignature] = useState<EmailSignatureConfig | null>(null);
  const [toSuggestions, setToSuggestions] = useState<CallyUser[]>([]);
  const [ccSuggestions, setCcSuggestions] = useState<CallyUser[]>([]);
  const [bccSuggestions, setBccSuggestions] = useState<CallyUser[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { fetchContacts, searchContacts } = useContacts();

  // Fetch contacts + signature on mount
  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  useEffect(() => {
    fetch("/api/data/app/inbox/signature")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data?.enabled) {
          setSignature(data.data);
        }
      })
      .catch(() => {
        // Signature fetch failed, ignore
      });
  }, []);

  // Auto-save draft
  const saveDraft = useCallback(async () => {
    if (sending) return;

    const draftData = {
      to,
      cc: cc.length > 0 ? cc : undefined,
      bcc: bcc.length > 0 ? bcc : undefined,
      subject,
      bodyText,
      mode,
      replyToEmailId:
        mode === "reply" || mode === "reply-all" ? originalEmailId : undefined,
      forwardOfEmailId: mode === "forward" ? originalEmailId : undefined,
    };

    setSavingDraft(true);
    try {
      if (draftId) {
        await fetch(`/api/data/app/inbox/drafts/${draftId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draftData),
        });
      } else {
        const res = await fetch("/api/data/app/inbox/drafts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draftData),
        });
        const data = await res.json();
        if (data.success && data.data?.id) {
          setDraftId(data.data.id);
          onDraftSaved?.(data.data.id);
        }
      }
    } catch (err) {
      console.log("[DBG][EmailComposer] Draft save error:", err);
    } finally {
      setSavingDraft(false);
    }
  }, [
    to,
    cc,
    bcc,
    subject,
    bodyText,
    mode,
    originalEmailId,
    draftId,
    sending,
    onDraftSaved,
  ]);

  // Reset auto-save timer on content change
  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    // Only auto-save if there's content
    if (to.length > 0 || subject || bodyText) {
      autoSaveTimerRef.current = setTimeout(saveDraft, AUTO_SAVE_DELAY);
    }
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to, cc, bcc, subject, bodyText]);

  const handleAddFiles = (files: FileList | null) => {
    if (!files) return;
    const newFiles: ReplyAttachment[] = [];

    for (let i = 0; i < files.length; i++) {
      if (attachments.length + newFiles.length >= MAX_ATTACHMENTS) {
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

    setAttachments((prev) => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadAttachment = async (
    att: ReplyAttachment,
  ): Promise<{
    s3Key: string;
    attachmentId: string;
  } | null> => {
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
    } catch {
      return null;
    }
  };

  const handleSend = async () => {
    if (to.length === 0) {
      setError("At least one recipient is required");
      return;
    }

    setSending(true);
    setError(null);

    try {
      // Upload attachments
      const uploadedAttachments: Array<{
        filename: string;
        contentType: string;
        size: number;
        s3Key: string;
        attachmentId: string;
      }> = [];

      for (const att of attachments) {
        const result = await uploadAttachment(att);
        if (!result) {
          setError(`Failed to upload ${att.file.name}`);
          setSending(false);
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

      // Determine which API to call
      if (mode === "compose") {
        const res = await fetch("/api/data/app/inbox/compose", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to,
            cc: cc.length > 0 ? cc : undefined,
            bcc: bcc.length > 0 ? bcc : undefined,
            subject: subject || "(no subject)",
            text: bodyText,
            attachments:
              uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
            draftId,
          }),
        });
        const data = await res.json();
        if (!data.success) {
          setError(data.error || "Failed to send");
          setSending(false);
          return;
        }
      } else {
        // Reply / Reply-All / Forward
        const res = await fetch(
          `/api/data/app/inbox/${originalEmailId}/reply`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mode,
              to,
              cc: cc.length > 0 ? cc : undefined,
              bcc: bcc.length > 0 ? bcc : undefined,
              text: bodyText,
              attachments:
                uploadedAttachments.length > 0
                  ? uploadedAttachments
                  : undefined,
            }),
          },
        );
        const data = await res.json();
        if (!data.success) {
          setError(data.error || "Failed to send");
          setSending(false);
          return;
        }
      }

      // Delete draft if exists
      if (draftId) {
        fetch(`/api/data/app/inbox/drafts/${draftId}`, {
          method: "DELETE",
        }).catch(() => {});
      }

      onSent?.();
    } catch (err) {
      console.error("[DBG][EmailComposer] Send error:", err);
      setError("Failed to send email");
    } finally {
      setSending(false);
    }
  };

  const modeLabel =
    mode === "compose"
      ? "New Email"
      : mode === "reply"
        ? "Reply"
        : mode === "reply-all"
          ? "Reply All"
          : "Forward";

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">{modeLabel}</h3>
        <div className="flex items-center gap-2">
          {savingDraft && (
            <span className="text-xs text-gray-400">Saving draft...</span>
          )}
          <button
            type="button"
            onClick={saveDraft}
            disabled={savingDraft || sending}
            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
          >
            Save Draft
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* To */}
        <EmailChipInput
          label="To"
          addresses={to}
          onChange={setTo}
          disabled={sending}
          suggestions={toSuggestions}
          onInputChange={(v) => setToSuggestions(searchContacts(v))}
        />

        {/* CC/BCC toggle */}
        {!showCcBcc && (
          <button
            type="button"
            onClick={() => setShowCcBcc(true)}
            className="text-xs text-gray-500 hover:text-gray-700 ml-14"
          >
            CC / BCC
          </button>
        )}

        {showCcBcc && (
          <>
            <EmailChipInput
              label="CC"
              addresses={cc}
              onChange={setCc}
              disabled={sending}
              suggestions={ccSuggestions}
              onInputChange={(v) => setCcSuggestions(searchContacts(v))}
            />
            <EmailChipInput
              label="BCC"
              addresses={bcc}
              onChange={setBcc}
              disabled={sending}
              suggestions={bccSuggestions}
              onInputChange={(v) => setBccSuggestions(searchContacts(v))}
            />
          </>
        )}

        {/* Subject */}
        {(mode === "compose" || mode === "forward") && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500 w-12 flex-shrink-0">
              Subj:
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none"
              disabled={sending}
            />
          </div>
        )}

        {/* Body */}
        <textarea
          value={bodyText}
          onChange={(e) => setBodyText(e.target.value)}
          placeholder="Type your message..."
          rows={8}
          className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-y"
          disabled={sending}
        />

        {/* Signature preview */}
        {signature?.enabled && signature.text && (
          <div className="border-t border-gray-100 pt-2 pl-1">
            <p className="text-xs text-gray-400 mb-1">Signature:</p>
            <p className="text-xs text-gray-500 whitespace-pre-line">
              {signature.text}
            </p>
          </div>
        )}

        {/* Attachment chips */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachments.map((att, idx) => (
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
                {!sending && (
                  <button
                    type="button"
                    onClick={() =>
                      setAttachments((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="ml-0.5 text-gray-400 hover:text-red-500"
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

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {/* Action bar */}
      <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleAddFiles(e.target.files)}
            disabled={sending || attachments.length >= MAX_ATTACHMENTS}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending || attachments.length >= MAX_ATTACHMENTS}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
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
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              disabled={sending}
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || to.length === 0}
            className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 text-sm font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {sending ? (
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
                Send
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export type { EmailComposerProps, EmailDraft };
