"use client";

import { useState, useEffect } from "react";

export interface ButtonAction {
  id: string;
  name: string;
  description: string;
}

export interface ButtonConfig {
  label: string;
  action: string;
}

export interface ButtonEditorOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: ButtonConfig) => void;
  currentConfig?: ButtonConfig;
  title?: string;
  /** Available actions for the dropdown */
  actions: ButtonAction[];
}

/**
 * ButtonEditorOverlay - A reusable overlay for editing button label and action
 */
export function ButtonEditorOverlay({
  isOpen,
  onClose,
  onSave,
  currentConfig,
  title = "Edit Button",
  actions,
}: ButtonEditorOverlayProps) {
  const [label, setLabel] = useState(currentConfig?.label || "");
  const [action, setAction] = useState(
    currentConfig?.action || actions[0]?.id || "",
  );

  // Sync state with props when modal opens
  useEffect(() => {
    if (isOpen) {
      setLabel(currentConfig?.label || "Book Now");
      setAction(currentConfig?.action || actions[0]?.id || "");
    }
  }, [isOpen, currentConfig, actions]);

  const handleSave = () => {
    if (!label.trim()) {
      return;
    }
    onSave({ label: label.trim(), action });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(4px)",
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        style={{
          position: "relative",
          backgroundColor: "white",
          borderRadius: "12px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          maxWidth: "480px",
          width: "100%",
          margin: "0 16px",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <h2
            style={{
              fontSize: "18px",
              fontWeight: 600,
              color: "#111827",
              margin: 0,
            }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              padding: "8px",
              color: "#9ca3af",
              borderRadius: "50%",
              border: "none",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            <svg
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M15 5L5 15M5 5l10 10" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "24px" }}>
          {/* Label Input */}
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: 500,
                color: "#374151",
                marginBottom: "8px",
              }}
            >
              Button Label
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Enter button text..."
              style={{
                width: "100%",
                padding: "12px 16px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Action Dropdown */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: 500,
                color: "#374151",
                marginBottom: "8px",
              }}
            >
              Button Action
            </label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 16px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
                backgroundColor: "white",
                cursor: "pointer",
              }}
            >
              {actions.map((act) => (
                <option key={act.id} value={act.id}>
                  {act.name}
                </option>
              ))}
            </select>
            {/* Action description */}
            {action && (
              <p
                style={{
                  marginTop: "8px",
                  fontSize: "13px",
                  color: "#6b7280",
                }}
              >
                {actions.find((a) => a.id === action)?.description}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "12px",
            padding: "16px 24px",
            borderTop: "1px solid #e5e7eb",
            backgroundColor: "#f9fafb",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              color: "#374151",
              fontWeight: 500,
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!label.trim()}
            style={{
              padding: "8px 24px",
              backgroundColor: !label.trim() ? "#d1d5db" : "#2563eb",
              color: "white",
              borderRadius: "8px",
              fontWeight: 500,
              border: "none",
              cursor: !label.trim() ? "not-allowed" : "pointer",
              fontSize: "14px",
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default ButtonEditorOverlay;
