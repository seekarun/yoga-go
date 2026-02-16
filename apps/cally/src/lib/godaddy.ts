/**
 * GoDaddy API Integration for CallyGo
 *
 * Manages domain search, purchase, and nameserver configuration.
 * Requires GODADDY_API_KEY and GODADDY_API_SECRET environment variables.
 * Optionally set GODADDY_ENV=production to use the live API (defaults to OTE sandbox).
 *
 * API Docs: https://developer.godaddy.com/doc
 */

import type { DomainAvailabilityResult, DomainSuggestion } from "@/types";

const GODADDY_API_BASE =
  process.env.GODADDY_ENV === "production"
    ? "https://api.godaddy.com"
    : "https://api.ote-godaddy.com";

/** TLDs to check when searching for domain availability */
const SUPPORTED_TLDS = [
  "com",
  "net",
  "org",
  "io",
  "co",
  "app",
  "dev",
  "me",
  "info",
  "biz",
  "com.au",
  "au",
];

/**
 * Get GoDaddy API authorization headers
 */
function getHeaders(): HeadersInit {
  const apiKey = process.env.GODADDY_API_KEY;
  const apiSecret = process.env.GODADDY_API_SECRET;

  console.log("[DBG][godaddy] GODADDY_API_KEY present:", !!apiKey);
  console.log("[DBG][godaddy] GODADDY_API_SECRET present:", !!apiSecret);
  console.log("[DBG][godaddy] Environment:", process.env.GODADDY_ENV || "ote");

  if (!apiKey || !apiSecret) {
    throw new Error(
      "GODADDY_API_KEY and GODADDY_API_SECRET environment variables are required",
    );
  }

  return {
    Authorization: `sso-key ${apiKey}:${apiSecret}`,
    "Content-Type": "application/json",
  };
}

/**
 * CallyGo registrant contact info for domain purchases.
 * TODO: Replace with real company details before production use.
 */
const CALLYGO_CONTACT = {
  nameFirst: "CallyGo",
  nameLast: "Admin",
  email: "domains@callygo.com",
  phone: "+61.400000000",
  addressMailing: {
    address1: "123 Business St",
    city: "Sydney",
    state: "NSW",
    postalCode: "2000",
    country: "AU",
  },
  organization: "CallyGo Pty Ltd",
};

// GoDaddy API response types
interface GoDaddyAvailabilityResponse {
  available: boolean;
  currency: string;
  definitive: boolean;
  domain: string;
  period: number;
  price: number;
}

interface GoDaddySuggestionResponse {
  domain: string;
}

interface GoDaddyPurchaseResponse {
  orderId: number;
  itemCount: number;
  total: number;
  currency: string;
}

interface GoDaddyDomainDetail {
  domain: string;
  status: string;
  expires: string;
  renewAuto: boolean;
  nameServers: string[];
}

interface GoDaddyErrorResponse {
  code: string;
  message: string;
  fields?: Array<{ path: string; code: string; message: string }>;
}

/**
 * Check domain availability across all supported TLDs for a given query.
 * Returns availability and pricing for each TLD variant.
 */
export async function checkDomainAvailability(
  query: string,
): Promise<DomainAvailabilityResult[]> {
  console.log("[DBG][godaddy] Checking availability for:", query);

  const domains = SUPPORTED_TLDS.map((tld) => `${query}.${tld}`);
  const results: DomainAvailabilityResult[] = [];

  // GoDaddy's /v1/domains/available only checks one domain at a time,
  // so we batch requests in parallel
  const checks = domains.map(async (domain) => {
    try {
      const response = await fetch(
        `${GODADDY_API_BASE}/v1/domains/available?domain=${encodeURIComponent(domain)}&checkType=FAST`,
        {
          method: "GET",
          headers: getHeaders(),
        },
      );

      if (!response.ok) {
        console.error(
          "[DBG][godaddy] Availability check failed for",
          domain,
          "status:",
          response.status,
        );
        return null;
      }

      const data = (await response.json()) as GoDaddyAvailabilityResponse;
      return {
        domain: data.domain,
        available: data.available,
        price: data.price,
        currency: data.currency,
        period: data.period,
      };
    } catch (error) {
      console.error(
        "[DBG][godaddy] Error checking availability for",
        domain,
        ":",
        error,
      );
      return null;
    }
  });

  const settled = await Promise.all(checks);
  for (const result of settled) {
    if (result) {
      results.push(result);
    }
  }

  console.log(
    "[DBG][godaddy] Availability results:",
    results.length,
    "of",
    domains.length,
    "checked",
  );
  return results;
}

/**
 * Get domain name suggestions from GoDaddy for a given query.
 */
export async function getDomainSuggestions(
  query: string,
): Promise<DomainSuggestion[]> {
  console.log("[DBG][godaddy] Getting suggestions for:", query);

  try {
    const tlds = SUPPORTED_TLDS.join(",");
    const response = await fetch(
      `${GODADDY_API_BASE}/v1/domains/suggest?query=${encodeURIComponent(query)}&limit=5&tlds=${encodeURIComponent(tlds)}`,
      {
        method: "GET",
        headers: getHeaders(),
      },
    );

    if (!response.ok) {
      console.error(
        "[DBG][godaddy] Suggestions request failed:",
        response.status,
      );
      return [];
    }

    const data = (await response.json()) as GoDaddySuggestionResponse[];
    console.log("[DBG][godaddy] Got", data.length, "suggestions");

    return data.map((s) => ({ domain: s.domain }));
  } catch (error) {
    console.error("[DBG][godaddy] Error getting suggestions:", error);
    return [];
  }
}

/**
 * Purchase a domain via GoDaddy with CallyGo as registrant.
 * Sets Vercel nameservers and enables auto-renew.
 */
export async function purchaseDomain(domain: string): Promise<{
  success: boolean;
  orderId?: string;
  error?: string;
  errorCode?: string;
}> {
  console.log("[DBG][godaddy] Purchasing domain:", domain);

  const vercelNameservers = ["ns1.vercel-dns.com", "ns2.vercel-dns.com"];

  try {
    const purchaseBody = {
      domain,
      consent: {
        agreementKeys: ["DNRA"],
        agreedBy: "CallyGo System",
        agreedAt: new Date().toISOString(),
      },
      contactAdmin: CALLYGO_CONTACT,
      contactBilling: CALLYGO_CONTACT,
      contactRegistrant: CALLYGO_CONTACT,
      contactTech: CALLYGO_CONTACT,
      nameServers: vercelNameservers,
      period: 1,
      privacy: true,
      renewAuto: true,
    };

    const response = await fetch(`${GODADDY_API_BASE}/v1/domains/purchase`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(purchaseBody),
    });

    if (!response.ok) {
      const errorData = (await response.json()) as GoDaddyErrorResponse;
      console.error("[DBG][godaddy] Purchase failed:", errorData);

      return {
        success: false,
        error: errorData.message || "Domain purchase failed",
        errorCode: errorData.code,
      };
    }

    const data = (await response.json()) as GoDaddyPurchaseResponse;
    console.log("[DBG][godaddy] Purchase successful, orderId:", data.orderId);

    return {
      success: true,
      orderId: String(data.orderId),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[DBG][godaddy] Error purchasing domain:", errorMessage);
    return {
      success: false,
      error: `Failed to connect to GoDaddy API: ${errorMessage}`,
    };
  }
}

/**
 * Update nameservers for a domain via GoDaddy.
 */
export async function setDomainNameservers(
  domain: string,
  nameservers: string[],
): Promise<{ success: boolean; error?: string }> {
  console.log(
    "[DBG][godaddy] Setting nameservers for",
    domain,
    "to:",
    nameservers,
  );

  try {
    const response = await fetch(
      `${GODADDY_API_BASE}/v1/domains/${encodeURIComponent(domain)}`,
      {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ nameServers: nameservers }),
      },
    );

    if (!response.ok) {
      const errorData = (await response.json()) as GoDaddyErrorResponse;
      console.error("[DBG][godaddy] NS update failed:", errorData);
      return {
        success: false,
        error: errorData.message || "Failed to update nameservers",
      };
    }

    console.log("[DBG][godaddy] Nameservers updated for:", domain);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[DBG][godaddy] Error setting nameservers:", errorMessage);
    return {
      success: false,
      error: `Failed to connect to GoDaddy API: ${errorMessage}`,
    };
  }
}

/**
 * Get domain details from GoDaddy (status, renewal date, nameservers).
 */
export async function getDomainDetails(domain: string): Promise<{
  success: boolean;
  details?: {
    status: string;
    expires: string;
    renewAuto: boolean;
    nameServers: string[];
  };
  error?: string;
}> {
  console.log("[DBG][godaddy] Getting domain details for:", domain);

  try {
    const response = await fetch(
      `${GODADDY_API_BASE}/v1/domains/${encodeURIComponent(domain)}`,
      {
        method: "GET",
        headers: getHeaders(),
      },
    );

    if (!response.ok) {
      const errorData = (await response.json()) as GoDaddyErrorResponse;
      console.error("[DBG][godaddy] Domain details failed:", errorData);
      return {
        success: false,
        error: errorData.message || "Failed to get domain details",
      };
    }

    const data = (await response.json()) as GoDaddyDomainDetail;
    console.log("[DBG][godaddy] Domain details:", data.domain, data.status);

    return {
      success: true,
      details: {
        status: data.status,
        expires: data.expires,
        renewAuto: data.renewAuto,
        nameServers: data.nameServers,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[DBG][godaddy] Error getting domain details:", errorMessage);
    return {
      success: false,
      error: `Failed to connect to GoDaddy API: ${errorMessage}`,
    };
  }
}
