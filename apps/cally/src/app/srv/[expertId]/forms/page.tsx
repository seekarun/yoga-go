"use client";

import { useState, useEffect, useCallback } from "react";
import type { ContactFormConfig, ContactFormField } from "@/types";
import ContactFormEditor from "@/components/dashboard/forms/ContactFormEditor";
import ContactFormList from "@/components/dashboard/forms/ContactFormList";
import ContactFormSubmissions from "@/components/dashboard/forms/ContactFormSubmissions";

type ViewMode = "list" | "create" | "edit" | "submissions";

export default function FormsPage() {
  const [forms, setForms] = useState<ContactFormConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [editingForm, setEditingForm] = useState<ContactFormConfig | null>(
    null,
  );
  const [viewingForm, setViewingForm] = useState<ContactFormConfig | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchForms = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/data/app/contact-forms");
      const json = await res.json();
      if (json.success && json.data) {
        setForms(json.data);
      } else {
        setError(json.error || "Failed to load forms");
      }
    } catch {
      setError("Failed to load forms");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  const handleCreate = async (data: {
    name: string;
    fields: ContactFormField[];
  }) => {
    setSaving(true);
    try {
      const res = await fetch("/api/data/app/contact-forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.success) {
        setViewMode("list");
        await fetchForms();
      } else {
        setError(json.error || "Failed to create form");
      }
    } catch {
      setError("Failed to create form");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (data: {
    name: string;
    fields: ContactFormField[];
  }) => {
    if (!editingForm) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/data/app/contact-forms/${editingForm.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.success) {
        setViewMode("list");
        setEditingForm(null);
        await fetchForms();
      } else {
        setError(json.error || "Failed to update form");
      }
    } catch {
      setError("Failed to update form");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (formId: string) => {
    if (!confirm("Delete this form? This cannot be undone.")) return;
    setDeleting(formId);
    try {
      const res = await fetch(`/api/data/app/contact-forms/${formId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        await fetchForms();
      } else {
        setError(json.error || "Failed to delete form");
      }
    } catch {
      setError("Failed to delete form");
    } finally {
      setDeleting(null);
    }
  };

  const handleEdit = (form: ContactFormConfig) => {
    setEditingForm(form);
    setViewMode("edit");
  };

  const handleViewSubmissions = (form: ContactFormConfig) => {
    setViewingForm(form);
    setViewMode("submissions");
  };

  return (
    <div className="max-w-3xl mx-auto">
      {viewMode !== "submissions" && (
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-main)]">
              Contact Forms
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Create custom forms and wire them to CTA buttons on your landing
              page
            </p>
          </div>
          {viewMode === "list" && (
            <button
              onClick={() => setViewMode("create")}
              className="px-4 py-2 bg-[var(--color-primary)] text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-colors"
            >
              + New Form
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      {viewMode === "list" && loading && (
        <div className="text-center py-12 text-[var(--text-muted)] text-sm">
          Loading forms...
        </div>
      )}

      {viewMode === "list" && !loading && (
        <ContactFormList
          forms={forms}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onViewSubmissions={handleViewSubmissions}
          deleting={deleting}
        />
      )}

      {viewMode === "create" && (
        <ContactFormEditor
          onSave={handleCreate}
          onCancel={() => setViewMode("list")}
          saving={saving}
        />
      )}

      {viewMode === "edit" && editingForm && (
        <ContactFormEditor
          initialForm={editingForm}
          onSave={handleUpdate}
          onCancel={() => {
            setViewMode("list");
            setEditingForm(null);
          }}
          saving={saving}
        />
      )}

      {viewMode === "submissions" && viewingForm && (
        <ContactFormSubmissions
          formConfig={viewingForm}
          onBack={() => {
            setViewMode("list");
            setViewingForm(null);
          }}
        />
      )}
    </div>
  );
}
