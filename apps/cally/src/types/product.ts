/**
 * Product Types for Cally
 * Products/services that tenants offer in their catalog
 */

export interface Product {
  id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  price: number; // in smallest currency unit (cents)
  color?: string;
  image?: string;
  imagePosition?: string;
  imageZoom?: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}
