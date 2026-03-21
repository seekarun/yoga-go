"use client";

import { useState, useCallback } from "react";
import type { ContactFormConfig, ContactFormField } from "@/types";
import { useSpamProtection } from "@core/hooks";
import { useOptionalAuth } from "@/contexts/AuthContext";

interface DynamicContactFormProps {
  config: ContactFormConfig;
  onSubmit: (data: {
    fields: Record<string, string>;
    _hp: string;
    _t: string;
  }) => void;
  submitting: boolean;
}

function renderField(
  field: ContactFormField,
  value: string,
  onChange: (val: string) => void,
  disabled: boolean,
  error?: string,
) {
  const baseClass = `w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 ${
    error ? "border-red-400" : "border-gray-300"
  }`;

  const label = (
    <label
      htmlFor={`field-${field.id}`}
      className="block text-sm font-medium text-gray-700 mb-1"
    >
      {field.name}
      {field.required && " *"}
    </label>
  );

  switch (field.type) {
    case "textarea":
      return (
        <div key={field.id}>
          {label}
          <textarea
            id={`field-${field.id}`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            required={field.required}
            disabled={disabled}
            className={`${baseClass} resize-none`}
          />
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
      );

    case "dropdown":
      return (
        <div key={field.id}>
          {label}
          <select
            id={`field-${field.id}`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            disabled={disabled}
            className={baseClass}
          >
            <option value="">
              {field.placeholder || "Select an option..."}
            </option>
            {(field.options || []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
      );

    case "email":
      return (
        <div key={field.id}>
          {label}
          <input
            id={`field-${field.id}`}
            type="email"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || "you@example.com"}
            required={field.required}
            disabled={disabled}
            className={baseClass}
          />
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
      );

    case "phone":
      return (
        <div key={field.id}>
          {label}
          <input
            id={`field-${field.id}`}
            type="tel"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || "Your phone number"}
            required={field.required}
            disabled={disabled}
            className={baseClass}
          />
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
      );

    default:
      // text
      return (
        <div key={field.id}>
          {label}
          <input
            id={`field-${field.id}`}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            disabled={disabled}
            className={baseClass}
          />
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
      );
  }
}

export default function DynamicContactForm({
  config,
  onSubmit,
  submitting,
}: DynamicContactFormProps) {
  const auth = useOptionalAuth();
  const { honeypotProps, getSpamFields } = useSpamProtection();
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const field of config.fields) {
      // Pre-populate email/name from auth if available
      if (
        field.type === "email" &&
        auth?.isAuthenticated &&
        auth.user?.profile.email
      ) {
        initial[field.id] = auth.user.profile.email;
      } else if (
        field.type === "text" &&
        field.name.toLowerCase().includes("name") &&
        auth?.isAuthenticated &&
        auth.user?.profile.name
      ) {
        initial[field.id] = auth.user.profile.name;
      } else {
        initial[field.id] = "";
      }
    }
    return initial;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = useCallback((fieldId: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [fieldId]: value }));
    setErrors((prev) => {
      if (prev[fieldId]) {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      }
      return prev;
    });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    const newErrors: Record<string, string> = {};
    for (const field of config.fields) {
      const val = (fieldValues[field.id] || "").trim();
      if (field.required && !val) {
        newErrors[field.id] = `${field.name} is required`;
      }
      if (
        field.type === "email" &&
        val &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)
      ) {
        newErrors[field.id] = "Please enter a valid email address";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Trim all values
    const trimmed: Record<string, string> = {};
    for (const [key, val] of Object.entries(fieldValues)) {
      trimmed[key] = val.trim();
    }

    onSubmit({ fields: trimmed, ...getSpamFields() });
  };

  const allRequiredFilled = config.fields
    .filter((f) => f.required)
    .every((f) => (fieldValues[f.id] || "").trim());

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input {...honeypotProps} />
      {config.fields.map((field) =>
        renderField(
          field,
          fieldValues[field.id] || "",
          (val) => updateField(field.id, val),
          submitting,
          errors[field.id],
        ),
      )}
      <button
        type="submit"
        disabled={submitting || !allRequiredFilled}
        className="w-full py-2.5 px-4 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? "Sending..." : "Submit"}
      </button>
    </form>
  );
}
