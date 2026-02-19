"use client";

import { useState } from "react";
import type { EmailLabel } from "@/types";

const PRESET_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
];

interface LabelManagerProps {
  labels: EmailLabel[];
  onClose: () => void;
  onCreated: (label: EmailLabel) => void;
  onUpdated: (label: EmailLabel) => void;
  onDeleted: (labelId: string) => void;
}

export default function LabelManager({
  labels,
  onClose,
  onCreated,
  onUpdated,
  onDeleted,
}: LabelManagerProps) {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[5]);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/data/app/inbox/labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), color: newColor }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        onCreated(data.data);
        setNewName("");
        setNewColor(PRESET_COLORS[5]);
      }
    } catch (err) {
      console.log("[DBG][LabelManager] Create error:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = (label: EmailLabel) => {
    setEditingId(label.id);
    setEditName(label.name);
    setEditColor(label.color);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/data/app/inbox/labels/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), color: editColor }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        onUpdated(data.data);
        setEditingId(null);
      }
    } catch (err) {
      console.log("[DBG][LabelManager] Update error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (labelId: string) => {
    if (!confirm("Delete this label? It will be removed from all emails."))
      return;
    try {
      const res = await fetch(`/api/data/app/inbox/labels/${labelId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        onDeleted(labelId);
        if (editingId === labelId) setEditingId(null);
      }
    } catch (err) {
      console.log("[DBG][LabelManager] Delete error:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Manage Labels</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Create new label */}
        <div className="p-4 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-600 mb-2">
            Create new label
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Label name"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
            />
            <div className="flex gap-1">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  className={`w-5 h-5 rounded-full border-2 transition-colors ${
                    newColor === c ? "border-gray-800" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              className="px-3 py-1.5 bg-[var(--color-primary)] text-white text-sm rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>

        {/* Existing labels */}
        <div className="max-h-[300px] overflow-y-auto">
          {labels.length === 0 ? (
            <p className="p-6 text-center text-sm text-gray-400">
              No labels created yet
            </p>
          ) : (
            labels.map((label) => (
              <div
                key={label.id}
                className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-50 last:border-b-0"
              >
                {editingId === label.id ? (
                  <>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 border border-gray-200 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                    />
                    <div className="flex gap-0.5">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setEditColor(c)}
                          className={`w-4 h-4 rounded-full border-2 ${
                            editColor === c
                              ? "border-gray-800"
                              : "border-transparent"
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      disabled={saving}
                      className="text-xs text-[var(--color-primary)] font-medium hover:underline disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: label.color }}
                    />
                    <span className="flex-1 text-sm text-gray-700 truncate">
                      {label.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleEdit(label)}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(label.id)}
                      className="text-xs text-gray-400 hover:text-red-500"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        <div className="p-3 border-t border-gray-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
