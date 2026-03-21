"use client";

import type { ContactFormConfig } from "@/types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface ContactFormListProps {
  forms: ContactFormConfig[];
  onEdit: (form: ContactFormConfig) => void;
  onDelete: (formId: string) => void;
  deleting: string | null;
}

export default function ContactFormList({
  forms,
  onEdit,
  onDelete,
  deleting,
}: ContactFormListProps) {
  if (forms.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--text-muted)]">
        <svg
          className="w-12 h-12 mx-auto mb-3 opacity-30"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
          />
        </svg>
        <p className="text-sm">No contact forms yet</p>
        <p className="text-xs mt-1">
          Create a form to collect information from visitors
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {forms.map((form) => (
        <div
          key={form.id}
          className="flex items-center justify-between border border-[var(--color-border)] rounded-lg p-4 bg-white hover:shadow-sm transition-shadow"
        >
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-[var(--text-main)] truncate">
              {form.name}
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {form.fields.length} field{form.fields.length !== 1 ? "s" : ""} ·
              Created {formatDate(form.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={() => onEdit(form)}
              className="px-3 py-1.5 text-xs font-medium border border-[var(--color-border)] rounded-lg hover:bg-gray-50 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(form.id)}
              disabled={deleting === form.id}
              className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              {deleting === form.id ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
