"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ToolbarContainer from "./ToolbarContainer";
import {
  BUILTIN_TYPOGRAPHY_ROLES,
  type TypographyRole,
  type CustomFontType,
} from "@/types/landing-page";
import { FONT_OPTIONS, getFontWeights, WEIGHT_LABELS } from "./fonts";

type TextAlign = "left" | "center" | "right";

interface TextToolbarProps {
  typographyRole: TypographyRole;
  textAlign: TextAlign;
  onTypographyRoleChange?: (value: TypographyRole) => void;
  onTextAlignChange: (value: TextAlign) => void;
  customFontTypes?: CustomFontType[];
  onAddCustomFontType?: (ft: CustomFontType) => void;
}

const ALIGN_OPTIONS: { value: TextAlign; icon: React.ReactNode }[] = [
  {
    value: "left",
    icon: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="15" y2="12" />
        <line x1="3" y1="18" x2="18" y2="18" />
      </svg>
    ),
  },
  {
    value: "center",
    icon: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="6" y1="12" x2="18" y2="12" />
        <line x1="4" y1="18" x2="20" y2="18" />
      </svg>
    ),
  },
  {
    value: "right",
    icon: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="9" y1="12" x2="21" y2="12" />
        <line x1="6" y1="18" x2="21" y2="18" />
      </svg>
    ),
  },
];

export default function TextToolbar({
  typographyRole,
  textAlign,
  onTypographyRoleChange,
  onTextAlignChange,
  customFontTypes,
  onAddCustomFontType,
}: TextToolbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newFamily, setNewFamily] = useState(FONT_OPTIONS[1]?.value ?? "");
  const [newWeight, setNewWeight] = useState(400);
  const [newSize, setNewSize] = useState(16);
  const [newColor, setNewColor] = useState("#1a1a1a");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
        setAdding(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  // Reset new-weight when family changes (pick closest available weight)
  useEffect(() => {
    const weights = getFontWeights(newFamily);
    if (!weights.includes(newWeight)) {
      setNewWeight(weights.includes(400) ? 400 : weights[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-check when family changes
  }, [newFamily]);

  const handleAdd = useCallback(() => {
    if (!newName.trim() || !onAddCustomFontType) return;
    onAddCustomFontType({
      name: newName.trim(),
      font: {
        family: newFamily,
        weight: newWeight,
        size: newSize,
        color: newColor,
      },
    });
    // Select the newly added custom type
    onTypographyRoleChange?.(`custom:${newName.trim()}`);
    setNewName("");
    setNewFamily(FONT_OPTIONS[1]?.value ?? "");
    setNewWeight(400);
    setNewSize(16);
    setNewColor("#1a1a1a");
    setAdding(false);
    setDropdownOpen(false);
  }, [
    newName,
    newFamily,
    newWeight,
    newSize,
    newColor,
    onAddCustomFontType,
    onTypographyRoleChange,
  ]);

  const groupStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  };

  const dividerStyle: React.CSSProperties = {
    width: "1px",
    height: "20px",
    backgroundColor: "#e5e7eb",
    flexShrink: 0,
  };

  // Resolve current label — built-in or custom
  const builtinMatch = BUILTIN_TYPOGRAPHY_ROLES.find(
    (o) => o.value === typographyRole,
  );
  const customMatch = typographyRole.startsWith("custom:")
    ? customFontTypes?.find((ft) => ft.name === typographyRole.slice(7))
    : undefined;
  const currentLabel = builtinMatch?.label ?? customMatch?.name ?? "Body";

  const optionButtonStyle = (isSelected: boolean): React.CSSProperties => ({
    display: "block",
    width: "100%",
    textAlign: "left",
    background: isSelected ? "rgba(59,130,246,0.08)" : "none",
    border: "none",
    cursor: "pointer",
    padding: "6px 10px",
    borderRadius: "5px",
    fontSize: "12px",
    fontWeight: isSelected ? 600 : 400,
    color: isSelected ? "#3b82f6" : "#374151",
    transition: "background 0.12s",
  });

  return (
    <ToolbarContainer>
      {/* Typography Role Picker */}
      <div ref={dropdownRef} style={{ ...groupStyle, position: "relative" }}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="4 7 4 4 20 4 20 7" />
          <line x1="9" y1="20" x2="15" y2="20" />
          <line x1="12" y1="4" x2="12" y2="20" />
        </svg>
        <button
          type="button"
          onClick={() =>
            onTypographyRoleChange && setDropdownOpen((prev) => !prev)
          }
          style={{
            background: "none",
            border: "none",
            cursor: onTypographyRoleChange ? "pointer" : "default",
            padding: "2px 4px",
            borderRadius: "4px",
            fontSize: "11px",
            fontWeight: 500,
            color: "#6b7280",
            letterSpacing: "0.02em",
            display: "flex",
            alignItems: "center",
            gap: "3px",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => {
            if (onTypographyRoleChange)
              e.currentTarget.style.background = "rgba(0,0,0,0.04)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "none";
          }}
        >
          {currentLabel}
          {onTypographyRoleChange && (
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: dropdownOpen ? "rotate(180deg)" : undefined,
                transition: "transform 0.15s",
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          )}
        </button>

        {/* Dropdown */}
        {dropdownOpen && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              background: "#fff",
              borderRadius: "8px",
              boxShadow:
                "0 4px 16px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)",
              padding: "4px",
              zIndex: 100,
              minWidth: "220px",
            }}
          >
            {/* Built-in roles */}
            {BUILTIN_TYPOGRAPHY_ROLES.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onTypographyRoleChange?.(opt.value);
                  setDropdownOpen(false);
                }}
                style={optionButtonStyle(opt.value === typographyRole)}
                onMouseEnter={(e) => {
                  if (opt.value !== typographyRole)
                    e.currentTarget.style.background = "rgba(0,0,0,0.03)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background =
                    opt.value === typographyRole
                      ? "rgba(59,130,246,0.08)"
                      : "none";
                }}
              >
                {opt.label}
              </button>
            ))}

            {/* Custom font types */}
            {customFontTypes && customFontTypes.length > 0 && (
              <>
                <div
                  style={{
                    height: "1px",
                    backgroundColor: "#e5e7eb",
                    margin: "4px 0",
                  }}
                />
                {customFontTypes.map((ft) => {
                  const val = `custom:${ft.name}`;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        onTypographyRoleChange?.(val);
                        setDropdownOpen(false);
                      }}
                      style={optionButtonStyle(val === typographyRole)}
                      onMouseEnter={(e) => {
                        if (val !== typographyRole)
                          e.currentTarget.style.background = "rgba(0,0,0,0.03)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background =
                          val === typographyRole
                            ? "rgba(59,130,246,0.08)"
                            : "none";
                      }}
                    >
                      {ft.name}
                    </button>
                  );
                })}
              </>
            )}

            {/* Add new custom type */}
            {onAddCustomFontType && (
              <>
                <div
                  style={{
                    height: "1px",
                    backgroundColor: "#e5e7eb",
                    margin: "4px 0",
                  }}
                />
                {adding ? (
                  <div
                    style={{ padding: "6px 8px" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Name */}
                    <input
                      type="text"
                      placeholder="Type name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAdd();
                        if (e.key === "Escape") {
                          setAdding(false);
                          setNewName("");
                        }
                      }}
                      autoFocus
                      style={{
                        width: "100%",
                        padding: "4px 6px",
                        fontSize: "11px",
                        border: "1px solid #d1d5db",
                        borderRadius: "4px",
                        outline: "none",
                        marginBottom: "4px",
                      }}
                    />
                    {/* Font family */}
                    <select
                      value={newFamily}
                      onChange={(e) => setNewFamily(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "4px 6px",
                        fontSize: "11px",
                        border: "1px solid #d1d5db",
                        borderRadius: "4px",
                        outline: "none",
                        marginBottom: "4px",
                        background: "#fff",
                      }}
                    >
                      {FONT_OPTIONS.map((fo) => (
                        <option key={fo.value} value={fo.value}>
                          {fo.label}
                        </option>
                      ))}
                    </select>
                    {/* Weight + Size row */}
                    <div
                      style={{
                        display: "flex",
                        gap: "4px",
                        marginBottom: "4px",
                      }}
                    >
                      <select
                        value={newWeight}
                        onChange={(e) => setNewWeight(Number(e.target.value))}
                        style={{
                          flex: 1,
                          padding: "4px 4px",
                          fontSize: "11px",
                          border: "1px solid #d1d5db",
                          borderRadius: "4px",
                          outline: "none",
                          background: "#fff",
                        }}
                      >
                        {getFontWeights(newFamily).map((w) => (
                          <option key={w} value={w}>
                            {WEIGHT_LABELS[w] || w}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={8}
                        max={120}
                        value={newSize}
                        onChange={(e) =>
                          setNewSize(
                            Math.max(8, Math.min(120, Number(e.target.value))),
                          )
                        }
                        style={{
                          width: "52px",
                          padding: "4px 4px",
                          fontSize: "11px",
                          border: "1px solid #d1d5db",
                          borderRadius: "4px",
                          outline: "none",
                          textAlign: "center",
                        }}
                        title="Font size (px)"
                      />
                    </div>
                    {/* Color */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        marginBottom: "6px",
                      }}
                    >
                      <input
                        type="color"
                        value={newColor}
                        onChange={(e) => setNewColor(e.target.value)}
                        style={{
                          width: "24px",
                          height: "24px",
                          border: "1px solid #d1d5db",
                          borderRadius: "4px",
                          padding: 0,
                          cursor: "pointer",
                          background: "none",
                        }}
                      />
                      <span
                        style={{
                          fontSize: "11px",
                          color: "#6b7280",
                          fontFamily: "monospace",
                        }}
                      >
                        {newColor}
                      </span>
                    </div>
                    {/* Actions */}
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button
                        type="button"
                        onClick={() => {
                          setAdding(false);
                          setNewName("");
                          setNewWeight(400);
                          setNewSize(16);
                          setNewColor("#1a1a1a");
                        }}
                        style={{
                          flex: 1,
                          padding: "3px 6px",
                          fontSize: "11px",
                          background: "none",
                          border: "1px solid #d1d5db",
                          borderRadius: "4px",
                          cursor: "pointer",
                          color: "#6b7280",
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleAdd}
                        disabled={!newName.trim()}
                        style={{
                          flex: 1,
                          padding: "3px 6px",
                          fontSize: "11px",
                          background: newName.trim() ? "#3b82f6" : "#e5e7eb",
                          border: "none",
                          borderRadius: "4px",
                          cursor: newName.trim() ? "pointer" : "default",
                          color: "#fff",
                          fontWeight: 500,
                        }}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAdding(true)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      width: "100%",
                      padding: "6px 10px",
                      background: "none",
                      border: "none",
                      borderRadius: "5px",
                      fontSize: "12px",
                      color: "#6b7280",
                      cursor: "pointer",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(0,0,0,0.03)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "none";
                    }}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Add new...
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div style={dividerStyle} />

      {/* Text Alignment */}
      <div style={groupStyle}>
        {ALIGN_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onTextAlignChange(opt.value)}
            style={{
              background:
                textAlign === opt.value ? "rgba(59,130,246,0.1)" : "none",
              border: "none",
              cursor: "pointer",
              padding: "3px",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: textAlign === opt.value ? "#3b82f6" : "#374151",
              transition: "background 0.15s, color 0.15s",
            }}
            title={`Align ${opt.value}`}
          >
            {opt.icon}
          </button>
        ))}
      </div>
    </ToolbarContainer>
  );
}

export type { TextToolbarProps, TypographyRole };
