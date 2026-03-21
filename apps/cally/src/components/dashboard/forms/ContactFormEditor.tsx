"use client";

import { useState } from "react";
import type {
  ContactFormConfig,
  ContactFormField,
  ContactFieldType,
} from "@/types";

/** Standard fields — Name and Email are always included, Mobile is optional */
const STANDARD_FIELD_IDS = ["_name", "_email", "_mobile"];

const STANDARD_FIELDS: {
  id: string;
  label: string;
  field: ContactFormField;
  alwaysOn: boolean;
}[] = [
  {
    id: "_name",
    label: "Name",
    alwaysOn: true,
    field: {
      id: "_name",
      name: "Name",
      type: "text",
      required: true,
      placeholder: "Your full name",
    },
  },
  {
    id: "_email",
    label: "Email",
    alwaysOn: true,
    field: {
      id: "_email",
      name: "Email",
      type: "email",
      required: true,
      placeholder: "you@example.com",
    },
  },
  {
    id: "_mobile",
    label: "Mobile",
    alwaysOn: false,
    field: {
      id: "_mobile",
      name: "Mobile",
      type: "phone",
      required: false,
      placeholder: "Your phone number",
    },
  },
];

const FIELD_TYPES: { value: ContactFieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "textarea", label: "Text Area" },
  { value: "dropdown", label: "Dropdown" },
];

interface ContactFormEditorProps {
  initialForm?: ContactFormConfig;
  onSave: (data: { name: string; fields: ContactFormField[] }) => void;
  onCancel: () => void;
  saving: boolean;
}

function generateFieldId() {
  return `fld-${Math.random().toString(36).substring(2, 8)}`;
}

/** Split existing fields into standard toggles + custom fields */
function parseInitialFields(fields: ContactFormField[]) {
  const enabledStandard = new Set<string>();
  const customFields: ContactFormField[] = [];

  for (const f of fields) {
    if (STANDARD_FIELD_IDS.includes(f.id)) {
      enabledStandard.add(f.id);
    } else if (
      f.id === "name" ||
      (f.type === "text" && f.name.toLowerCase() === "name")
    ) {
      enabledStandard.add("_name");
    } else if (f.type === "email" && f.name.toLowerCase() === "email") {
      enabledStandard.add("_email");
    } else if (
      (f.type === "phone" && f.name.toLowerCase() === "mobile") ||
      (f.type === "phone" && f.name.toLowerCase() === "phone")
    ) {
      enabledStandard.add("_mobile");
    } else {
      customFields.push(f);
    }
  }

  // Name and Email are always on
  enabledStandard.add("_name");
  enabledStandard.add("_email");

  // Detect if mobile was required in the existing form
  const mobileField = fields.find(
    (f) => f.id === "_mobile" || f.type === "phone",
  );
  const mobileRequired = mobileField?.required ?? false;

  return { enabledStandard, customFields, mobileRequired };
}

export default function ContactFormEditor({
  initialForm,
  onSave,
  onCancel,
  saving,
}: ContactFormEditorProps) {
  const [formName, setFormName] = useState(initialForm?.name || "");

  const initial = initialForm
    ? parseInitialFields(initialForm.fields)
    : {
        enabledStandard: new Set(["_name", "_email"]),
        customFields: [],
        mobileRequired: false,
      };

  const [standardEnabled, setStandardEnabled] = useState<Set<string>>(
    initial.enabledStandard,
  );
  const [mobileRequired, setMobileRequired] = useState(initial.mobileRequired);
  const [customFields, setCustomFields] = useState<ContactFormField[]>(
    initial.customFields,
  );

  const toggleStandard = (id: string) => {
    // Name and Email cannot be toggled off
    const def = STANDARD_FIELDS.find((s) => s.id === id);
    if (def?.alwaysOn) return;

    setStandardEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Custom field operations
  const addField = () => {
    setCustomFields([
      ...customFields,
      {
        id: generateFieldId(),
        name: "",
        type: "text",
        required: false,
        placeholder: "",
      },
    ]);
  };

  const updateField = (index: number, updates: Partial<ContactFormField>) => {
    const updated = [...customFields];
    updated[index] = { ...updated[index], ...updates };
    if (updates.type && updates.type !== "dropdown") {
      delete updated[index].options;
    }
    if (updates.type === "dropdown" && !updated[index].options?.length) {
      updated[index].options = ["Option 1", "Option 2"];
    }
    setCustomFields(updated);
  };

  const removeField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const moveField = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= customFields.length) return;
    const updated = [...customFields];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setCustomFields(updated);
  };

  const updateOption = (
    fieldIndex: number,
    optIndex: number,
    value: string,
  ) => {
    const updated = [...customFields];
    const opts = [...(updated[fieldIndex].options || [])];
    opts[optIndex] = value;
    updated[fieldIndex] = { ...updated[fieldIndex], options: opts };
    setCustomFields(updated);
  };

  const addOption = (fieldIndex: number) => {
    const updated = [...customFields];
    const opts = [...(updated[fieldIndex].options || [])];
    opts.push("");
    updated[fieldIndex] = { ...updated[fieldIndex], options: opts };
    setCustomFields(updated);
  };

  const removeOption = (fieldIndex: number, optIndex: number) => {
    const updated = [...customFields];
    const opts = (updated[fieldIndex].options || []).filter(
      (_, i) => i !== optIndex,
    );
    updated[fieldIndex] = { ...updated[fieldIndex], options: opts };
    setCustomFields(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    // Assemble: standard fields first, then custom fields
    const allFields: ContactFormField[] = [];
    for (const std of STANDARD_FIELDS) {
      if (standardEnabled.has(std.id)) {
        // Apply mobile required toggle
        if (std.id === "_mobile") {
          allFields.push({ ...std.field, required: mobileRequired });
        } else {
          allFields.push(std.field);
        }
      }
    }
    for (const f of customFields) {
      if (f.name.trim()) {
        allFields.push(f);
      }
    }
    if (allFields.length === 0) return;
    onSave({ name: formName.trim(), fields: allFields });
  };

  const totalFields =
    STANDARD_FIELDS.filter((s) => standardEnabled.has(s.id)).length +
    customFields.filter((f) => f.name.trim()).length;

  const isValid = formName.trim() && totalFields > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Form name */}
      <div>
        <label
          htmlFor="form-name"
          className="block text-sm font-medium text-[var(--text-main)] mb-1"
        >
          Form Name *
        </label>
        <input
          id="form-name"
          type="text"
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          placeholder="e.g. Consultation Request"
          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        />
      </div>

      {/* Standard fields */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-main)] mb-3">
          Standard Fields
        </h3>
        <div className="space-y-2">
          {STANDARD_FIELDS.map((std) => (
            <div
              key={std.id}
              className={`flex items-center gap-3 px-4 py-3 border rounded-lg transition-colors ${
                standardEnabled.has(std.id)
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                  : "border-[var(--color-border)] bg-white"
              } ${std.alwaysOn ? "opacity-80" : ""}`}
            >
              <label
                className={`flex items-center gap-3 flex-1 ${
                  std.alwaysOn ? "" : "cursor-pointer"
                }`}
              >
                <input
                  type="checkbox"
                  checked={standardEnabled.has(std.id)}
                  onChange={() => toggleStandard(std.id)}
                  disabled={std.alwaysOn}
                  className="rounded"
                />
                <span className="text-sm font-medium text-[var(--text-main)]">
                  {std.label}
                </span>
                {std.alwaysOn && (
                  <span className="text-xs text-[var(--text-muted)]">
                    (always included)
                  </span>
                )}
                {std.id === "_mobile" &&
                  standardEnabled.has("_mobile") &&
                  !mobileRequired && (
                    <span className="text-xs text-[var(--text-muted)]">
                      (optional)
                    </span>
                  )}
              </label>
              {/* Required/Optional toggle for Mobile */}
              {std.id === "_mobile" && standardEnabled.has("_mobile") && (
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mobileRequired}
                    onChange={(e) => setMobileRequired(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-xs text-[var(--text-body)]">
                    Required
                  </span>
                </label>
              )}
              {std.id !== "_mobile" && (
                <span className="text-xs text-[var(--text-muted)] capitalize">
                  {std.field.type}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Custom fields */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--text-main)]">
            Additional Fields{" "}
            {customFields.length > 0 && `(${customFields.length})`}
          </h3>
          <button
            type="button"
            onClick={addField}
            className="text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            + Add Field
          </button>
        </div>

        {customFields.length === 0 && (
          <p className="text-xs text-[var(--text-muted)] py-3">
            Add custom fields like dropdowns, text areas, or extra text inputs.
          </p>
        )}

        <div className="space-y-4">
          {customFields.map((field, idx) => (
            <div
              key={field.id}
              className="border border-[var(--color-border)] rounded-lg p-4 bg-white"
            >
              <div className="flex items-start gap-3">
                {/* Reorder buttons */}
                <div className="flex flex-col gap-1 pt-1">
                  <button
                    type="button"
                    onClick={() => moveField(idx, "up")}
                    disabled={idx === 0}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    title="Move up"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 15l7-7 7 7"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => moveField(idx, "down")}
                    disabled={idx === customFields.length - 1}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    title="Move down"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                </div>

                {/* Field config */}
                <div className="flex-1 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={field.name}
                      onChange={(e) =>
                        updateField(idx, { name: e.target.value })
                      }
                      placeholder="Field name"
                      className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                    <select
                      value={field.type}
                      onChange={(e) =>
                        updateField(idx, {
                          type: e.target.value as ContactFieldType,
                        })
                      }
                      className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    >
                      {FIELD_TYPES.map((ft) => (
                        <option key={ft.value} value={ft.value}>
                          {ft.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={field.placeholder || ""}
                      onChange={(e) =>
                        updateField(idx, { placeholder: e.target.value })
                      }
                      placeholder="Placeholder text"
                      className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                    <label className="flex items-center gap-2 text-sm text-[var(--text-body)]">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) =>
                          updateField(idx, { required: e.target.checked })
                        }
                        className="rounded"
                      />
                      Required
                    </label>
                  </div>

                  {/* Dropdown options */}
                  {field.type === "dropdown" && (
                    <div className="pl-2 border-l-2 border-[var(--color-border)] space-y-2">
                      <p className="text-xs font-medium text-[var(--text-muted)]">
                        Options
                      </p>
                      {(field.options || []).map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) =>
                              updateOption(idx, optIdx, e.target.value)
                            }
                            placeholder={`Option ${optIdx + 1}`}
                            className="flex-1 px-2 py-1.5 border border-[var(--color-border)] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                          />
                          <button
                            type="button"
                            onClick={() => removeOption(idx, optIdx)}
                            className="text-red-400 hover:text-red-600 text-xs"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addOption(idx)}
                        className="text-xs text-[var(--color-primary)] hover:underline"
                      >
                        + Add Option
                      </button>
                    </div>
                  )}
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => removeField(idx)}
                  className="text-red-400 hover:text-red-600 p-1"
                  title="Remove field"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
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
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving || !isValid}
          className="px-6 py-2.5 bg-[var(--color-primary)] text-white text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : initialForm ? "Update Form" : "Create Form"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 border border-[var(--color-border)] text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
