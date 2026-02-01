// Base Types - Generic foundation types for all verticals

/**
 * Base entity with common fields for all database entities
 */
export interface BaseEntity {
  id: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  total?: number;
}

/**
 * Paginated API response
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}
