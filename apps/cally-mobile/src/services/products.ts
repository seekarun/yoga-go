import { API_BASE_URL, API_ENDPOINTS } from "../config/api";

export interface ProductImage {
  id: string;
  url: string;
  position?: string;
  zoom?: number;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  price: number; // cents
  color?: string;
  image?: string;
  images?: ProductImage[];
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductInput {
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
  color?: string;
  images?: ProductImage[];
  isActive: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function fetchProducts(
  accessToken: string,
): Promise<ApiResponse<Product[]>> {
  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.products}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return response.json();
}

export async function createProduct(
  input: CreateProductInput,
  accessToken: string,
): Promise<ApiResponse<Product>> {
  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.products}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });
  return response.json();
}

export async function updateProduct(
  productId: string,
  updates: Partial<Omit<Product, "id" | "createdAt" | "updatedAt">>,
  accessToken: string,
): Promise<ApiResponse<Product>> {
  const response = await fetch(
    `${API_BASE_URL}${API_ENDPOINTS.products}/${productId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(updates),
    },
  );
  return response.json();
}

export async function deleteProduct(
  productId: string,
  accessToken: string,
): Promise<ApiResponse<null>> {
  const response = await fetch(
    `${API_BASE_URL}${API_ENDPOINTS.products}/${productId}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  return response.json();
}

export async function uploadProductImage(
  imageUri: string,
  accessToken: string,
): Promise<ApiResponse<{ url: string }>> {
  const formData = new FormData();

  const filename = imageUri.split("/").pop() || "photo.jpg";
  const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
  const mimeType =
    ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : "image/jpeg";

  // React Native FormData expects this shape for file uploads
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formData.append("file", {
    uri: imageUri,
    name: filename,
    type: mimeType,
  } as any);

  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.imageUpload}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });
  return response.json();
}
