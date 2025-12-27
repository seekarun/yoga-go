/**
 * Expert Repository - DEPRECATED
 *
 * This file re-exports all functions from tenantRepository for backward compatibility.
 * Expert and Tenant entities have been consolidated into a single TENANT entity.
 *
 * For new code, import directly from tenantRepository.
 */

// Re-export types (Expert is already an alias for Tenant in tenantRepository)
export type { CreateTenantInput as CreateExpertInput, Expert } from './tenantRepository';

// Re-export functions
export {
  // Core CRUD - Expert aliases
  getTenantById as getExpertById,
  getAllTenants as getAllExperts,
  getTenantByUserId as getExpertByUserId,
  createTenant as createExpert,
  updateTenant as updateExpert,
  deleteTenant as deleteExpert,

  // Stats & Featured
  updateTenantStats as updateExpertStats,
  setFeatured,
  getFeaturedTenants as getFeaturedExperts,

  // Landing Page
  updateLandingPage,
  updateDraftLandingPage,
  publishLandingPage,
  discardDraftLandingPage,

  // Stripe Connect
  updateStripeConnect,
  hasActiveStripeConnect,

  // Razorpay Route (India Payouts)
  updateRazorpayRoute,
  hasActiveRazorpayRoute,

  // Cashfree Payouts (India - Alternative)
  updateCashfreePayout,
  hasActiveCashfreePayout,

  // Tenant-specific functions (also available)
  getTenantById,
  getAllTenants,
  getTenantByUserId,
  getTenantByDomain,
  getTenantByExpertId,
  createTenant,
  updateTenant,
  deleteTenant,
  addDomainToTenant,
  removeDomainFromTenant,
  getFeaturedTenants,
  updateTenantStats,
} from './tenantRepository';
