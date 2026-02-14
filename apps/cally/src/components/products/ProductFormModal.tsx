"use client";

import { useState, useEffect, useCallback } from "react";
import Modal, { ModalHeader } from "@/components/Modal";
import type { Product, ProductImage } from "@/types";
import { ImageEditorOverlay } from "@core/components";

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  product?: Product | null;
  currency: string;
}

const PRODUCT_COLORS = [
  { name: "Indigo", value: "#6366f1" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#22c55e" },
  { name: "Yellow", value: "#eab308" },
  { name: "Orange", value: "#f97316" },
  { name: "Pink", value: "#ec4899" },
];

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

export default function ProductFormModal({
  isOpen,
  onClose,
  onSaved,
  product,
  currency,
}: ProductFormModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [displayPrice, setDisplayPrice] = useState("0");
  const [color, setColor] = useState(PRODUCT_COLORS[0].value);
  const [isActive, setIsActive] = useState(true);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!product;
  const currencySymbol = CURRENCY_SYMBOLS[currency] || "$";

  // Populate form when editing
  useEffect(() => {
    if (product) {
      setName(product.name);
      setDescription(product.description || "");
      setDurationMinutes(product.durationMinutes);
      setDisplayPrice((product.price / 100).toFixed(2));
      setColor(product.color || PRODUCT_COLORS[0].value);
      setIsActive(product.isActive);
      // Load images: prefer images array, fallback to legacy image field
      if (product.images && product.images.length > 0) {
        setImages(product.images);
      } else if (product.image) {
        setImages([
          {
            id: `legacy-${product.id}`,
            url: product.image,
            position: product.imagePosition,
            zoom: product.imageZoom,
          },
        ]);
      } else {
        setImages([]);
      }
    } else {
      setName("");
      setDescription("");
      setDurationMinutes(30);
      setDisplayPrice("0");
      setColor(PRODUCT_COLORS[0].value);
      setIsActive(true);
      setImages([]);
    }
    setError(null);
  }, [product, isOpen]);

  const handleAddImage = useCallback(
    (data: { imageUrl: string; imagePosition: string; imageZoom: number }) => {
      if (!data.imageUrl) return;
      const newImage: ProductImage = {
        id: `img-${Date.now()}`,
        url: data.imageUrl,
        position: data.imagePosition,
        zoom: data.imageZoom,
      };
      setImages((prev) => [...prev, newImage]);
    },
    [],
  );

  const handleRemoveImage = useCallback((imageId: string) => {
    setImages((prev) => prev.filter((img) => img.id !== imageId));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!name.trim()) {
        setError("Name is required");
        return;
      }

      const duration = Number(durationMinutes);
      if (!Number.isInteger(duration) || duration < 5 || duration > 480) {
        setError("Duration must be between 5 and 480 minutes");
        return;
      }

      const priceInCents = Math.round(parseFloat(displayPrice) * 100);
      if (isNaN(priceInCents) || priceInCents < 0) {
        setError("Price must be a non-negative number");
        return;
      }

      setSaving(true);

      try {
        const body = {
          name: name.trim(),
          description: description.trim() || undefined,
          durationMinutes: duration,
          price: priceInCents,
          color,
          isActive,
          images,
          // Set legacy image field to first image for backward compat
          image: images.length > 0 ? images[0].url : undefined,
          imagePosition: images.length > 0 ? images[0].position : undefined,
          imageZoom: images.length > 0 ? images[0].zoom : undefined,
        };

        const url = isEditing
          ? `/api/data/app/products/${product.id}`
          : "/api/data/app/products";
        const method = isEditing ? "PUT" : "POST";

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const json = await res.json();
        if (!json.success) {
          setError(json.error || "Failed to save product");
          return;
        }

        onSaved();
        onClose();
      } catch {
        setError("Failed to save product");
      } finally {
        setSaving(false);
      }
    },
    [
      name,
      description,
      durationMinutes,
      displayPrice,
      color,
      isActive,
      images,
      isEditing,
      product,
      onSaved,
      onClose,
    ],
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg">
      <ModalHeader onClose={onClose}>
        {isEditing ? "Edit Product" : "Add Product"}
      </ModalHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Name */}
        <div>
          <label
            htmlFor="product-name"
            className="block text-sm font-medium text-[var(--text-muted)] mb-1"
          >
            Name *
          </label>
          <input
            id="product-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Hair Cut, Yoga Session"
            className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--text-main)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="product-description"
            className="block text-sm font-medium text-[var(--text-muted)] mb-1"
          >
            Description
          </label>
          <textarea
            id="product-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this service"
            rows={3}
            className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--text-main)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
          />
        </div>

        {/* Images */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
            Images
          </label>
          <div className="flex gap-2 flex-wrap">
            {images.map((img) => (
              <div
                key={img.id}
                className="relative w-20 h-20 rounded-lg overflow-hidden border border-[var(--color-border)] group"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${img.url})`,
                    backgroundPosition: img.position || "50% 50%",
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(img.id)}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove image"
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setShowImageEditor(true)}
              className="w-20 h-20 rounded-lg border-2 border-dashed border-[var(--color-border)] flex flex-col items-center justify-center text-[var(--text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
              title="Add image"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span className="text-[10px] mt-0.5">Add</span>
            </button>
          </div>
        </div>

        {/* Duration and Price row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="product-duration"
              className="block text-sm font-medium text-[var(--text-muted)] mb-1"
            >
              Duration (minutes) *
            </label>
            <input
              id="product-duration"
              type="number"
              min={5}
              max={480}
              step={1}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--text-main)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              required
            />
          </div>
          <div>
            <label
              htmlFor="product-price"
              className="block text-sm font-medium text-[var(--text-muted)] mb-1"
            >
              Price ({currencySymbol}) *
            </label>
            <input
              id="product-price"
              type="number"
              min={0}
              step="0.01"
              value={displayPrice}
              onChange={(e) => setDisplayPrice(e.target.value)}
              className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--text-main)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              required
            />
          </div>
        </div>

        {/* Color */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
            Color
          </label>
          <div className="flex gap-2 flex-wrap">
            {PRODUCT_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setColor(c.value)}
                className="w-8 h-8 rounded-full transition-transform hover:scale-110"
                style={{
                  backgroundColor: c.value,
                  border:
                    color === c.value
                      ? "3px solid #111827"
                      : "2px solid transparent",
                }}
                title={c.name}
              />
            ))}
          </div>
        </div>

        {/* Active toggle */}
        <div className="flex items-center gap-3">
          <label
            htmlFor="product-active"
            className="text-sm font-medium text-[var(--text-muted)]"
          >
            Active
          </label>
          <button
            id="product-active"
            type="button"
            onClick={() => setIsActive(!isActive)}
            className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
            style={{
              backgroundColor: isActive ? "var(--color-primary)" : "#d1d5db",
            }}
          >
            <span
              className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow"
              style={{
                transform: isActive ? "translateX(24px)" : "translateX(4px)",
              }}
            />
          </button>
          <span className="text-sm text-[var(--text-muted)]">
            {isActive ? "Visible to customers" : "Hidden from customers"}
          </span>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[var(--text-muted)] bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary)] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? "Saving..." : isEditing ? "Save Changes" : "Add Product"}
          </button>
        </div>
      </form>

      {/* Image Editor Overlay */}
      <ImageEditorOverlay
        isOpen={showImageEditor}
        onClose={() => setShowImageEditor(false)}
        onSave={handleAddImage}
        currentImage={undefined}
        currentPosition={undefined}
        currentZoom={undefined}
        title="Add Product Image"
        aspectRatio="16/9"
        defaultSearchQuery={name.trim() || "professional service"}
        uploadEndpoint="/api/data/app/tenant/landing-page/upload"
      />
    </Modal>
  );
}
