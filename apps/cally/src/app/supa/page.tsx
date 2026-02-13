"use client";

import { useState, useEffect, useCallback } from "react";

interface TenantSummary {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: string;
  subscriptionTier: string;
  subscriptionStatus: string;
}

interface DeleteResult {
  tenantId: string;
  counts: Record<string, number | boolean>;
  totalDeleted: number;
  warnings?: string[];
}

export default function SupaAdminPage() {
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmTenantId, setConfirmTenantId] = useState<string | null>(null);
  const [confirmInput, setConfirmInput] = useState("");
  const [deleteResult, setDeleteResult] = useState<DeleteResult | null>(null);

  const fetchTenants = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/supa/tenants");
      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
      const data = await res.json();
      setTenants(data.tenants);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch tenants");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const handleDeleteClick = (tenantId: string) => {
    setConfirmTenantId(tenantId);
    setConfirmInput("");
    setDeleteResult(null);
  };

  const handleCancelDelete = () => {
    setConfirmTenantId(null);
    setConfirmInput("");
  };

  const handleConfirmDelete = async () => {
    if (!confirmTenantId) return;

    const tenant = tenants.find((t) => t.id === confirmTenantId);
    if (!tenant || confirmInput !== tenant.name) return;

    try {
      setDeleting(confirmTenantId);
      const res = await fetch("/api/supa/delete-tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: confirmTenantId }),
      });

      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);

      const data = await res.json();
      setDeleteResult(data.result);
      setConfirmTenantId(null);
      setConfirmInput("");

      // Refresh tenant list
      await fetchTenants();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete tenant");
    } finally {
      setDeleting(null);
    }
  };

  const confirmTenant = confirmTenantId
    ? tenants.find((t) => t.id === confirmTenantId)
    : null;

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <h1 style={{ margin: 0, color: "var(--text-main)" }}>CallyGo Admin</h1>
        <span
          style={{
            background: "#dc2626",
            color: "#fff",
            padding: "0.25rem 0.75rem",
            borderRadius: "9999px",
            fontSize: "0.75rem",
            fontWeight: 600,
          }}
        >
          Localhost Only
        </span>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            padding: "1rem",
            marginBottom: "1rem",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "0.5rem",
            color: "#991b1b",
          }}
        >
          {error}
          <button
            onClick={() => setError(null)}
            style={{
              marginLeft: "1rem",
              background: "none",
              border: "none",
              color: "#991b1b",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Delete Result */}
      {deleteResult && (
        <div
          style={{
            padding: "1rem",
            marginBottom: "1rem",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "0.5rem",
            color: "#166534",
          }}
        >
          <strong>Deleted tenant {deleteResult.tenantId}</strong>
          <span style={{ marginLeft: "0.5rem" }}>
            ({deleteResult.totalDeleted} items)
          </span>
          <div
            style={{
              marginTop: "0.5rem",
              fontSize: "0.875rem",
              display: "flex",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            {Object.entries(deleteResult.counts).map(([key, val]) => {
              if (key === "domainLookup") {
                return val ? (
                  <span key={key} style={countBadgeStyle}>
                    Domain lookup: cleaned
                  </span>
                ) : null;
              }
              if (key === "vercelDomain") {
                if (val === true) {
                  return (
                    <span key={key} style={countBadgeStyle}>
                      Vercel domain: removed
                    </span>
                  );
                }
                // false with warning is shown below
                return null;
              }
              if (typeof val === "number" && val > 0) {
                return (
                  <span key={key} style={countBadgeStyle}>
                    {key}: {val}
                  </span>
                );
              }
              return null;
            })}
          </div>
          {deleteResult.warnings && deleteResult.warnings.length > 0 && (
            <div
              style={{
                marginTop: "0.75rem",
                padding: "0.75rem",
                background: "#fef3c7",
                border: "1px solid #fbbf24",
                borderRadius: "0.375rem",
                fontSize: "0.813rem",
                color: "#92400e",
              }}
            >
              <strong>Warnings:</strong>
              {deleteResult.warnings.map((w, i) => (
                <div key={i} style={{ marginTop: "0.25rem" }}>
                  {w}
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => setDeleteResult(null)}
            style={{
              marginTop: "0.5rem",
              background: "none",
              border: "none",
              color: "#166534",
              cursor: "pointer",
              textDecoration: "underline",
              fontSize: "0.875rem",
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmTenant && (
        <div
          style={{
            padding: "1.5rem",
            marginBottom: "1.5rem",
            background: "#fff7ed",
            border: "2px solid #fb923c",
            borderRadius: "0.5rem",
          }}
        >
          <h3 style={{ margin: "0 0 0.5rem 0", color: "#9a3412" }}>
            Confirm Deletion
          </h3>
          <p style={{ margin: "0 0 1rem 0", color: "#9a3412" }}>
            This will permanently delete <strong>all data</strong> for tenant{" "}
            <strong>{confirmTenant.name}</strong> ({confirmTenant.id}). This
            action cannot be undone.
          </p>
          <p style={{ margin: "0 0 0.5rem 0", color: "#9a3412" }}>
            Type <strong>{confirmTenant.name}</strong> to confirm:
          </p>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={confirmTenant.name}
              style={{
                flex: 1,
                padding: "0.5rem 0.75rem",
                border: "1px solid var(--color-border, #d1d5db)",
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
              }}
            />
            <button
              onClick={handleConfirmDelete}
              disabled={
                confirmInput !== confirmTenant.name ||
                deleting === confirmTenant.id
              }
              style={{
                padding: "0.5rem 1rem",
                background:
                  confirmInput === confirmTenant.name ? "#dc2626" : "#9ca3af",
                color: "#fff",
                border: "none",
                borderRadius: "0.375rem",
                cursor:
                  confirmInput === confirmTenant.name
                    ? "pointer"
                    : "not-allowed",
                fontSize: "0.875rem",
                fontWeight: 600,
              }}
            >
              {deleting === confirmTenant.id ? "Deleting..." : "Delete"}
            </button>
            <button
              onClick={handleCancelDelete}
              style={{
                padding: "0.5rem 1rem",
                background: "transparent",
                border: "1px solid var(--color-border, #d1d5db)",
                borderRadius: "0.375rem",
                cursor: "pointer",
                fontSize: "0.875rem",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tenant Table */}
      <h2 style={{ color: "var(--text-main)", marginBottom: "1rem" }}>
        Tenants ({tenants.length})
      </h2>

      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading tenants...</p>
      ) : tenants.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>No tenants found.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.875rem",
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "2px solid var(--color-border, #e5e7eb)",
                }}
              >
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Created</th>
                <th style={thStyle}>Tier</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => (
                <tr
                  key={tenant.id}
                  style={{
                    borderBottom: "1px solid var(--color-border, #e5e7eb)",
                  }}
                >
                  <td style={tdStyle}>
                    <code style={{ fontSize: "0.75rem" }}>{tenant.id}</code>
                  </td>
                  <td style={tdStyle}>{tenant.name}</td>
                  <td style={tdStyle}>{tenant.email}</td>
                  <td style={tdStyle}>
                    {new Date(tenant.createdAt).toLocaleDateString()}
                  </td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        padding: "0.125rem 0.5rem",
                        borderRadius: "9999px",
                        fontSize: "0.75rem",
                        background:
                          tenant.subscriptionTier === "free"
                            ? "#f3f4f6"
                            : "#dbeafe",
                        color:
                          tenant.subscriptionTier === "free"
                            ? "#6b7280"
                            : "#1d4ed8",
                      }}
                    >
                      {tenant.subscriptionTier}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => handleDeleteClick(tenant.id)}
                      disabled={deleting === tenant.id}
                      style={{
                        padding: "0.25rem 0.75rem",
                        background: "#fee2e2",
                        color: "#dc2626",
                        border: "1px solid #fecaca",
                        borderRadius: "0.375rem",
                        cursor: "pointer",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                      }}
                    >
                      {deleting === tenant.id ? "Deleting..." : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "0.75rem",
  color: "var(--text-muted, #6b7280)",
  fontWeight: 600,
};

const tdStyle: React.CSSProperties = {
  padding: "0.75rem",
  color: "var(--text-main, #111827)",
};

const countBadgeStyle: React.CSSProperties = {
  background: "#dcfce7",
  padding: "0.125rem 0.5rem",
  borderRadius: "0.25rem",
  fontSize: "0.75rem",
};
