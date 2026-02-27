"use client";

import { useState, useEffect, useCallback } from "react";
import type { Product, ProductType } from "@/types";
import ProductFormModal from "@/components/products/ProductFormModal";

const CURRENCY_SYMBOLS: Record<string, string> = {
  AUD: "$",
  USD: "$",
  GBP: "\u00a3",
  EUR: "\u20ac",
  INR: "\u20b9",
  NZD: "$",
  CAD: "$",
  SGD: "$",
};

function formatPrice(cents: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] || "$";
  return `${symbol}${(cents / 100).toFixed(2)}`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatWebinarMeta(product: Product): string {
  const parts: string[] = [];
  if (product.webinarSchedule?.sessions) {
    const count = product.webinarSchedule.sessions.length;
    parts.push(`${count} session${count !== 1 ? "s" : ""}`);
  }
  if (product.maxParticipants) {
    parts.push(`Max ${product.maxParticipants} participants`);
  }
  return parts.join(" \u00b7 ");
}

interface ProductCardProps {
  product: Product;
  currency: string;
  deletingId: string | null;
  onToggleActive: (product: Product) => void;
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
}

function ProductCard({
  product,
  currency,
  deletingId,
  onToggleActive,
  onEdit,
  onDelete,
}: ProductCardProps) {
  const isWebinar = product.productType === "webinar";

  // Combine images array with legacy single image field
  const images = product.images?.length
    ? product.images
    : product.image
      ? [{ id: "legacy", url: product.image, position: product.imagePosition }]
      : [];

  return (
    <div className="bg-white rounded-lg border border-[var(--color-border)] p-4 flex items-start gap-4 hover:shadow-sm transition-shadow">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {product.color && (
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: product.color }}
            />
          )}
          <h3 className="font-semibold text-[var(--text-main)] truncate">
            {product.name}
          </h3>
          {!product.isActive && (
            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
              Inactive
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm text-[var(--text-muted)] mb-1">
          {isWebinar ? (
            <span className="flex items-center gap-1">
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
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {formatWebinarMeta(product)}
            </span>
          ) : (
            <span className="flex items-center gap-1">
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
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {formatDuration(product.durationMinutes)}
            </span>
          )}
          <span className="font-medium text-[var(--text-main)]">
            {product.price > 0 ? formatPrice(product.price, currency) : "Free"}
          </span>
        </div>
        {product.description && (
          <p className="text-sm text-[var(--text-muted)] truncate mb-1">
            {product.description}
          </p>
        )}
        {/* Image thumbnails */}
        {images.length > 0 && (
          <div className="flex gap-1.5">
            {images.map((img, i) => (
              // eslint-disable-next-line @next/next/no-img-element -- product thumbnails, small fixed size
              <img
                key={img.id || i}
                src={img.url}
                alt=""
                className="w-10 h-10 rounded object-cover border border-[var(--color-border)]"
                style={
                  img.position ? { objectPosition: img.position } : undefined
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-start gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={() => onToggleActive(product)}
          className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
          style={{
            backgroundColor: product.isActive
              ? "var(--color-primary)"
              : "#d1d5db",
          }}
          title={product.isActive ? "Deactivate" : "Activate"}
        >
          <span
            className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow"
            style={{
              transform: product.isActive
                ? "translateX(24px)"
                : "translateX(4px)",
            }}
          />
        </button>

        <button
          type="button"
          onClick={() => onEdit(product)}
          className="p-1.5 text-[var(--text-muted)] hover:text-[var(--color-primary)] hover:bg-gray-100 rounded-lg transition-colors"
          title="Edit"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => onDelete(product.id)}
          disabled={deletingId === product.id}
          className="p-1.5 text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
          title="Delete"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

interface SectionEmptyStateProps {
  type: "service" | "webinar";
  onAdd: () => void;
}

function SectionEmptyState({ type, onAdd }: SectionEmptyStateProps) {
  const isWebinar = type === "webinar";
  return (
    <div className="bg-white rounded-lg border border-[var(--color-border)] border-dashed p-8 text-center">
      <p className="text-sm text-[var(--text-muted)] mb-3">
        {isWebinar
          ? "No webinars yet. Create one with a fixed schedule for visitors to sign up."
          : "No services yet. Add a bookable service for your visitors."}
      </p>
      <button
        onClick={onAdd}
        className="px-3 py-1.5 text-sm font-medium text-[var(--color-primary)] border border-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary)] hover:text-white transition-colors"
      >
        Add {isWebinar ? "Webinar" : "Service"}
      </button>
    </div>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [currency, setCurrency] = useState("AUD");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalDefaultType, setModalDefaultType] =
    useState<ProductType>("service");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const [productsRes, prefsRes] = await Promise.all([
        fetch("/api/data/app/products"),
        fetch("/api/data/app/preferences"),
      ]);
      const productsJson = await productsRes.json();
      const prefsJson = await prefsRes.json();

      if (productsJson.success && productsJson.data) {
        setProducts(productsJson.data);
      } else {
        setError(productsJson.error || "Failed to load products");
      }

      if (prefsJson.success && prefsJson.data?.currency) {
        setCurrency(prefsJson.data.currency);
      }
    } catch {
      setError("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleToggleActive = async (product: Product) => {
    const newState = !product.isActive;

    // Optimistic update
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, isActive: newState } : p)),
    );

    try {
      const res = await fetch(`/api/data/app/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newState }),
      });
      const json = await res.json();
      if (!json.success) {
        // Revert on server failure
        setProducts((prev) =>
          prev.map((p) =>
            p.id === product.id ? { ...p, isActive: !newState } : p,
          ),
        );
      }
    } catch {
      // Revert on network error
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, isActive: !newState } : p,
        ),
      );
      console.error("[DBG][products] Failed to toggle active state");
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    setDeletingId(productId);

    try {
      const res = await fetch(`/api/data/app/products/${productId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setProducts((prev) => prev.filter((p) => p.id !== productId));
      }
    } catch {
      console.error("[DBG][products] Failed to delete product");
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setModalDefaultType(product.productType || "service");
    setShowModal(true);
  };

  const handleAdd = (type: ProductType) => {
    setEditingProduct(null);
    setModalDefaultType(type);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingProduct(null);
  };

  const services = products.filter((p) => p.productType !== "webinar");
  const webinars = products.filter((p) => p.productType === "webinar");

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-32 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-main)]">Products</h1>
        <p className="text-[var(--text-muted)] mt-1">
          Manage your services and webinars.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Services Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-[var(--text-main)]">
            Services
          </h2>
          <button
            onClick={() => handleAdd("service")}
            className="text-sm font-medium text-[var(--color-primary)] hover:underline flex items-center gap-1"
          >
            + Add Service
          </button>
        </div>
        {services.length === 0 ? (
          <SectionEmptyState
            type="service"
            onAdd={() => handleAdd("service")}
          />
        ) : (
          <div className="space-y-3">
            {services.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                currency={currency}
                deletingId={deletingId}
                onToggleActive={handleToggleActive}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Webinars Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-[var(--text-main)]">
            Webinars
          </h2>
          <button
            onClick={() => handleAdd("webinar")}
            className="text-sm font-medium text-[var(--color-primary)] hover:underline flex items-center gap-1"
          >
            + Add Webinar
          </button>
        </div>
        {webinars.length === 0 ? (
          <SectionEmptyState
            type="webinar"
            onAdd={() => handleAdd("webinar")}
          />
        ) : (
          <div className="space-y-3">
            {webinars.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                currency={currency}
                deletingId={deletingId}
                onToggleActive={handleToggleActive}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Product Form Modal */}
      <ProductFormModal
        isOpen={showModal}
        onClose={handleModalClose}
        onSaved={fetchProducts}
        product={editingProduct}
        currency={currency}
        defaultProductType={modalDefaultType}
      />
    </div>
  );
}
