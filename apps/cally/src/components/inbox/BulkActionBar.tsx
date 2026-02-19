"use client";

import { useState } from "react";
import type { EmailLabel } from "@/types";
import LabelPicker from "./LabelPicker";

interface BulkActionBarProps {
  selectedCount: number;
  folder: "inbox" | "sent" | "drafts" | "archive" | "trash";
  labels: EmailLabel[];
  selectedLabels: string[];
  onAction: (action: string, labelId?: string) => Promise<void>;
  onDeselectAll: () => void;
  onManageLabels: () => void;
}

export default function BulkActionBar({
  selectedCount,
  folder,
  labels,
  selectedLabels,
  onAction,
  onDeselectAll,
  onManageLabels,
}: BulkActionBarProps) {
  const [processing, setProcessing] = useState(false);
  const [showLabelPicker, setShowLabelPicker] = useState(false);

  const handleAction = async (action: string, labelId?: string) => {
    setProcessing(true);
    try {
      await onAction(action, labelId);
    } finally {
      setProcessing(false);
      setShowLabelPicker(false);
    }
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border-b border-blue-100">
      <span className="text-sm font-medium text-blue-700">
        {selectedCount} selected
      </span>

      <div className="h-4 w-px bg-blue-200 mx-1" />

      {/* Common actions */}
      <button
        type="button"
        disabled={processing}
        onClick={() => handleAction("markRead")}
        className="px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-blue-100 rounded transition-colors disabled:opacity-50"
        title="Mark as read"
      >
        Read
      </button>
      <button
        type="button"
        disabled={processing}
        onClick={() => handleAction("markUnread")}
        className="px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-blue-100 rounded transition-colors disabled:opacity-50"
        title="Mark as unread"
      >
        Unread
      </button>
      <button
        type="button"
        disabled={processing}
        onClick={() => handleAction("star")}
        className="px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-blue-100 rounded transition-colors disabled:opacity-50"
        title="Star"
      >
        Star
      </button>
      <button
        type="button"
        disabled={processing}
        onClick={() => handleAction("unstar")}
        className="px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-blue-100 rounded transition-colors disabled:opacity-50"
        title="Unstar"
      >
        Unstar
      </button>

      {/* Folder-specific actions */}
      {(folder === "inbox" || folder === "sent") && (
        <>
          <button
            type="button"
            disabled={processing}
            onClick={() => handleAction("archive")}
            className="px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-blue-100 rounded transition-colors disabled:opacity-50"
            title="Archive"
          >
            Archive
          </button>
          <button
            type="button"
            disabled={processing}
            onClick={() => handleAction("delete")}
            className="px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
            title="Delete"
          >
            Delete
          </button>
        </>
      )}
      {folder === "trash" && (
        <button
          type="button"
          disabled={processing}
          onClick={() => handleAction("restore")}
          className="px-2.5 py-1 text-xs font-medium text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
          title="Restore"
        >
          Restore
        </button>
      )}
      {folder === "archive" && (
        <button
          type="button"
          disabled={processing}
          onClick={() => handleAction("unarchive")}
          className="px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100 rounded transition-colors disabled:opacity-50"
          title="Move to inbox"
        >
          Unarchive
        </button>
      )}

      {/* Label dropdown */}
      {folder !== "drafts" && (
        <div className="relative">
          <button
            type="button"
            disabled={processing}
            onClick={() => setShowLabelPicker((prev) => !prev)}
            className="px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-blue-100 rounded transition-colors disabled:opacity-50 flex items-center gap-1"
            title="Apply label"
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
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
            Label
          </button>
          {showLabelPicker && (
            <LabelPicker
              labels={labels}
              selectedLabels={selectedLabels}
              onToggle={(labelId) => {
                const isAdding = !selectedLabels.includes(labelId);
                handleAction(isAdding ? "addLabel" : "removeLabel", labelId);
              }}
              onManageLabels={onManageLabels}
              onClose={() => setShowLabelPicker(false)}
            />
          )}
        </div>
      )}

      <div className="flex-1" />

      <button
        type="button"
        onClick={onDeselectAll}
        className="px-2.5 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-blue-100 rounded transition-colors"
      >
        Deselect all
      </button>
    </div>
  );
}
