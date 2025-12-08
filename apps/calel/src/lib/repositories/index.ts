/**
 * Calel Repositories - Data Access Layer
 *
 * Export all repository functions for easy importing.
 */

// Tenant operations
export {
  getTenantById,
  getTenantBySlug,
  getTenantByApiKey,
  getAllTenants,
  getActiveTenants,
  createTenant,
  updateTenant,
  updateTenantStatus,
  rotateApiKey,
  deleteTenant,
} from "./tenantRepository";
export type { CreateTenantInput, ApiKeyResult } from "./tenantRepository";

// Host operations
export {
  getHostById,
  getHostByEmail,
  getHostByExternalUserId,
  getHostBySlug,
  getHostsByTenant,
  getActiveHostsByTenant,
  createHost,
  updateHost,
  updateHostIntegrations,
  updateHostStatus,
  deleteHost,
} from "./hostRepository";
export type { CreateHostInput, UpdateHostInput } from "./hostRepository";

// Calendar Event operations
export {
  getEventById,
  getEventsByHost,
  getEventsByDateRange,
  getEventsByDate,
  createEvent,
  updateEvent,
  deleteEvent,
} from "./eventRepository";
export type {
  CalendarEvent,
  CreateEventInput,
  UpdateEventInput,
} from "./eventRepository";
