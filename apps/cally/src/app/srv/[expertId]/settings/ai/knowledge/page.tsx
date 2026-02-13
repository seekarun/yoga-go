"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";
import type { KnowledgeDocument } from "@/types";

export default function KnowledgeBasePage() {
  const params = useParams();
  const router = useRouter();
  const expertId = params.expertId as string;

  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Add form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      const response = await fetch("/api/data/app/ai/knowledge");
      const data = await response.json();

      if (data.success) {
        setDocuments(data.data.documents);
      } else {
        setError(data.error || "Failed to load knowledge base");
      }
    } catch (err) {
      console.error("[DBG][knowledge-page] Error fetching documents:", err);
      setError("Failed to load knowledge base");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleAdd = async () => {
    if (!title.trim() || !content.trim()) return;

    setAdding(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/data/app/ai/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTitle("");
        setContent("");
        setSuccessMessage("Knowledge entry added successfully!");
        await fetchDocuments();
      } else {
        setError(data.error || "Failed to add knowledge entry");
      }
    } catch (err) {
      console.error("[DBG][knowledge-page] Error adding document:", err);
      setError("Failed to add knowledge entry");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (docId: string) => {
    setDeletingId(docId);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/data/app/ai/knowledge/${docId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage("Knowledge entry deleted.");
        setDocuments((prev) => prev.filter((d) => d.id !== docId));
      } else {
        setError(data.error || "Failed to delete knowledge entry");
      }
    } catch (err) {
      console.error("[DBG][knowledge-page] Error deleting document:", err);
      setError("Failed to delete knowledge entry");
    } finally {
      setDeletingId(null);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "ready":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
            Ready
          </span>
        );
      case "processing":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
            Processing
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
            Failed
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[var(--text-main)]">
            Knowledge Base
          </h1>
          <p className="text-[var(--text-muted)] mt-1">
            Add information for your AI assistant to reference.
          </p>
        </div>
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={() => router.push(`/srv/${expertId}/settings/ai`)}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg
              className="w-5 h-5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-[var(--text-main)]">
            Knowledge Base
          </h1>
        </div>
        <p className="text-[var(--text-muted)] ml-8">
          Add FAQs, pricing, policies, and other information your AI assistant
          can reference when answering questions.
        </p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-600">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="mb-6 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-green-600">
          {successMessage}
        </div>
      )}

      <div className="max-w-2xl space-y-6">
        {/* Add Entry Card */}
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-[var(--text-main)]">
              Add Entry
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-main)] mb-1.5">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Pricing, Cancellation Policy, FAQ"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-main)] mb-1.5">
                Content
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter the information you want the AI to know about..."
                rows={6}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleAdd}
                disabled={adding || !title.trim() || !content.trim()}
                className="px-5 py-2.5 bg-[var(--color-primary)] text-white rounded-lg font-semibold text-sm hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {adding ? "Adding..." : "Add to Knowledge Base"}
              </button>
            </div>
          </div>
        </div>

        {/* Documents List */}
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-[var(--text-main)]">
              Knowledge Entries ({documents.length})
            </h2>
          </div>

          {documents.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] text-center py-8">
              No knowledge entries yet. Add your first entry above.
            </p>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-start justify-between p-4 border border-gray-100 rounded-lg hover:border-gray-200 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-[var(--text-main)] truncate">
                        {doc.title}
                      </h3>
                      {statusBadge(doc.status)}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                      {doc.status === "ready" && (
                        <span>{doc.chunkCount} chunks</span>
                      )}
                      {doc.status === "failed" && doc.errorMessage && (
                        <span className="text-red-500">{doc.errorMessage}</span>
                      )}
                      <span>
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(doc.id)}
                    disabled={deletingId === doc.id}
                    className="ml-3 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Delete entry"
                  >
                    {deletingId === doc.id ? (
                      <LoadingSpinner size="sm" />
                    ) : (
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
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
