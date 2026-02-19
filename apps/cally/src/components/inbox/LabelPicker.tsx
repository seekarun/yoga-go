"use client";

import { useRef, useEffect } from "react";
import type { EmailLabel } from "@/types";

interface LabelPickerProps {
  labels: EmailLabel[];
  selectedLabels: string[];
  onToggle: (labelId: string) => void;
  onManageLabels: () => void;
  onClose: () => void;
}

export default function LabelPicker({
  labels,
  selectedLabels,
  onToggle,
  onManageLabels,
  onClose,
}: LabelPickerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute z-50 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg w-56"
    >
      <div className="p-2 border-b border-gray-100">
        <p className="text-xs font-medium text-gray-500 px-1">Labels</p>
      </div>
      <div className="max-h-[200px] overflow-y-auto py-1">
        {labels.length === 0 ? (
          <p className="px-3 py-2 text-sm text-gray-400">No labels yet</p>
        ) : (
          labels.map((label) => {
            const isSelected = selectedLabels.includes(label.id);
            return (
              <button
                key={label.id}
                type="button"
                onClick={() => onToggle(label.id)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                    isSelected
                      ? "border-transparent"
                      : "border-gray-300 bg-white"
                  }`}
                  style={
                    isSelected ? { backgroundColor: label.color } : undefined
                  }
                >
                  {isSelected && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: label.color }}
                />
                <span className="truncate">{label.name}</span>
              </button>
            );
          })
        )}
      </div>
      <div className="border-t border-gray-100 p-1">
        <button
          type="button"
          onClick={onManageLabels}
          className="w-full text-left px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded transition-colors"
        >
          Manage labels...
        </button>
      </div>
    </div>
  );
}
