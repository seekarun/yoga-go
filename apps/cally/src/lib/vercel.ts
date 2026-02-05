/**
 * Vercel API Integration for Cally
 *
 * Manages custom domains via Vercel's REST API.
 * Requires VERCEL_TOKEN and VERCEL_PROJECT_ID environment variables.
 *
 * API Docs: https://vercel.com/docs/rest-api/endpoints#domains
 */

const VERCEL_API_BASE = "https://api.vercel.com";

interface VercelDomainConfig {
  name: string;
  apexName: string;
  verified: boolean;
  verification?: Array<{
    type: string;
    domain: string;
    value: string;
    reason: string;
  }>;
  error?: {
    code: string;
    message: string;
  };
}

interface VercelDomainResponse {
  domain: VercelDomainConfig;
  error?: {
    code: string;
    message: string;
  };
}

interface VercelDomainListResponse {
  domains: VercelDomainConfig[];
  pagination: {
    count: number;
    next: number | null;
    prev: number | null;
  };
}

export interface DomainVerification {
  type: "TXT" | "CNAME";
  name: string;
  value: string;
}

export interface AddDomainResult {
  success: boolean;
  domain?: string;
  verified?: boolean;
  verification?: DomainVerification[];
  error?: string;
}

/**
 * Get Vercel API headers
 */
function getHeaders(): HeadersInit {
  const token = process.env.VERCEL_TOKEN;
  console.log("[DBG][vercel] VERCEL_TOKEN present:", !!token);
  console.log(
    "[DBG][vercel] VERCEL_PROJECT_ID:",
    process.env.VERCEL_PROJECT_ID,
  );
  console.log("[DBG][vercel] VERCEL_TEAM_ID:", process.env.VERCEL_TEAM_ID);

  if (!token) {
    throw new Error("VERCEL_TOKEN environment variable is required");
  }

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

/**
 * Get team ID query param if configured
 */
function getTeamParam(): string {
  const teamId = process.env.VERCEL_TEAM_ID;
  return teamId ? `&teamId=${teamId}` : "";
}

/**
 * Add a custom domain to the Vercel project
 */
export async function addDomainToVercel(
  domain: string,
): Promise<AddDomainResult> {
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!projectId) {
    console.error("[DBG][vercel] VERCEL_PROJECT_ID not configured");
    return { success: false, error: "Vercel integration not configured" };
  }

  const normalizedDomain = domain.toLowerCase().trim();
  console.log("[DBG][vercel] Adding domain to Vercel:", normalizedDomain);

  try {
    const response = await fetch(
      `${VERCEL_API_BASE}/v10/projects/${projectId}/domains?${getTeamParam()}`,
      {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ name: normalizedDomain }),
      },
    );

    const data = (await response.json()) as VercelDomainResponse;
    console.log("[DBG][vercel] API response status:", response.status);
    console.log(
      "[DBG][vercel] API response data:",
      JSON.stringify(data, null, 2),
    );

    if (!response.ok) {
      console.error("[DBG][vercel] Failed to add domain:", data.error);

      // Handle specific error cases
      if (data.error?.code === "domain_already_in_use") {
        return {
          success: false,
          error: "Unable to add domain. This domain is already in use.",
        };
      }
      if (data.error?.code === "invalid_domain") {
        return { success: false, error: "Invalid domain format" };
      }

      return {
        success: false,
        error: data.error?.message || "Failed to add domain",
      };
    }

    // Handle case where domain object is missing (shouldn't happen on success)
    if (!data.domain) {
      // Check if the response itself contains domain info (different API response format)
      const domainData = data as unknown as VercelDomainConfig;
      if (domainData.name) {
        console.log(
          "[DBG][vercel] Domain added (alt format):",
          domainData.name,
          "verified:",
          domainData.verified,
        );
        const verification: DomainVerification[] = [];
        if (domainData.verification && domainData.verification.length > 0) {
          for (const v of domainData.verification) {
            verification.push({
              type: v.type as "TXT" | "CNAME",
              name: v.domain,
              value: v.value,
            });
          }
        }
        return {
          success: true,
          domain: domainData.name,
          verified: domainData.verified,
          verification,
        };
      }
      console.error(
        "[DBG][vercel] Unexpected response format - no domain data",
      );
      return { success: false, error: "Unexpected API response format" };
    }

    console.log(
      "[DBG][vercel] Domain added:",
      data.domain.name,
      "verified:",
      data.domain.verified,
    );

    // Convert verification requirements to user-friendly format
    const verification: DomainVerification[] = [];
    if (data.domain.verification && data.domain.verification.length > 0) {
      for (const v of data.domain.verification) {
        verification.push({
          type: v.type as "TXT" | "CNAME",
          name: v.domain,
          value: v.value,
        });
      }
    }

    return {
      success: true,
      domain: data.domain.name,
      verified: data.domain.verified,
      verification,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[DBG][vercel] Error adding domain:", errorMessage);
    return {
      success: false,
      error: `Failed to connect to Vercel API: ${errorMessage}`,
    };
  }
}

/**
 * Remove a custom domain from the Vercel project
 */
export async function removeDomainFromVercel(
  domain: string,
): Promise<{ success: boolean; error?: string }> {
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!projectId) {
    console.error("[DBG][vercel] VERCEL_PROJECT_ID not configured");
    return { success: false, error: "Vercel integration not configured" };
  }

  const normalizedDomain = domain.toLowerCase().trim();
  console.log("[DBG][vercel] Removing domain from Vercel:", normalizedDomain);

  try {
    const response = await fetch(
      `${VERCEL_API_BASE}/v9/projects/${projectId}/domains/${normalizedDomain}?${getTeamParam()}`,
      {
        method: "DELETE",
        headers: getHeaders(),
      },
    );

    if (!response.ok) {
      const data = await response.json();
      console.error("[DBG][vercel] Failed to remove domain:", data);
      return {
        success: false,
        error: data.error?.message || "Failed to remove domain",
      };
    }

    console.log("[DBG][vercel] Domain removed:", normalizedDomain);
    return { success: true };
  } catch (error) {
    console.error("[DBG][vercel] Error removing domain:", error);
    return { success: false, error: "Failed to connect to Vercel API" };
  }
}

/**
 * Check if domain's NS records point to Vercel's nameservers
 */
async function checkNsRecords(domain: string): Promise<boolean> {
  try {
    // Use DNS-over-HTTPS to check NS records
    const response = await fetch(
      `https://dns.google/resolve?name=${domain}&type=NS`,
    );
    if (!response.ok) return false;

    const data = await response.json();
    const nsRecords = data.Answer?.map((a: { data: string }) =>
      a.data.toLowerCase().replace(/\.$/, ""),
    );

    console.log("[DBG][vercel] NS records for domain:", nsRecords);

    // Check if NS records point to Vercel
    const vercelNs = ["ns1.vercel-dns.com", "ns2.vercel-dns.com"];
    const hasVercelNs = vercelNs.every((ns) => nsRecords?.includes(ns));

    return hasVercelNs;
  } catch (error) {
    console.error("[DBG][vercel] Error checking NS records:", error);
    return false;
  }
}

/**
 * Get domain configuration status from Vercel
 * This endpoint tells us if the domain's A/CNAME records point to Vercel
 */
async function getDomainConfig(domain: string): Promise<{
  configuredBy: "A" | "CNAME" | "NS" | null;
  misconfigured: boolean;
}> {
  try {
    const response = await fetch(
      `${VERCEL_API_BASE}/v6/domains/${domain}/config`,
      {
        method: "GET",
        headers: getHeaders(),
      },
    );

    if (!response.ok) {
      console.log("[DBG][vercel] Domain config check failed:", response.status);
      // Check if NS records point to Vercel as fallback
      const hasVercelNs = await checkNsRecords(domain);
      if (hasVercelNs) {
        console.log(
          "[DBG][vercel] Domain has Vercel NS records, considering configured",
        );
        return { configuredBy: "NS", misconfigured: false };
      }
      return { configuredBy: null, misconfigured: true };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await response.json()) as any;
    console.log(
      "[DBG][vercel] Domain config response:",
      JSON.stringify(data, null, 2),
    );

    // If configuredBy is null, check NS records as fallback
    if (!data.configuredBy) {
      const hasVercelNs = await checkNsRecords(domain);
      if (hasVercelNs) {
        console.log(
          "[DBG][vercel] Domain has Vercel NS records, considering configured",
        );
        return { configuredBy: "NS", misconfigured: false };
      }
    }

    return {
      configuredBy: data.configuredBy || null,
      misconfigured: data.misconfigured === true,
    };
  } catch (error) {
    console.error("[DBG][vercel] Error getting domain config:", error);
    return { configuredBy: null, misconfigured: true };
  }
}

/**
 * Get domain verification status from Vercel
 *
 * Note: Vercel's `verified` means DNS ownership is proven (TXT record),
 * but the domain may still have configuration issues (A/CNAME not pointing to Vercel).
 * We check both `verified` and the domain config endpoint for full verification.
 */
export async function getDomainStatus(domain: string): Promise<{
  exists: boolean;
  verified: boolean;
  verification?: DomainVerification[];
  error?: string;
}> {
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!projectId) {
    return {
      exists: false,
      verified: false,
      error: "Vercel integration not configured",
    };
  }

  const normalizedDomain = domain.toLowerCase().trim();

  try {
    const response = await fetch(
      `${VERCEL_API_BASE}/v9/projects/${projectId}/domains/${normalizedDomain}?${getTeamParam()}`,
      {
        method: "GET",
        headers: getHeaders(),
      },
    );

    if (response.status === 404) {
      return { exists: false, verified: false };
    }

    if (!response.ok) {
      const data = await response.json();
      return { exists: false, verified: false, error: data.error?.message };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await response.json()) as any;

    console.log(
      "[DBG][vercel] Domain status response:",
      JSON.stringify(data, null, 2),
    );

    const verification: DomainVerification[] = [];
    if (data.verification && data.verification.length > 0) {
      for (const v of data.verification) {
        verification.push({
          type: v.type as "TXT" | "CNAME",
          name: v.domain,
          value: v.value,
        });
      }
    }

    // Check domain configuration (A/CNAME pointing to Vercel) using separate endpoint
    const domainConfig = await getDomainConfig(normalizedDomain);

    // A domain is fully verified only if:
    // 1. DNS ownership is verified (data.verified === true)
    // 2. No configuration errors exist
    // 3. No pending verification requirements
    // 4. Domain is configured to point to Vercel (configuredBy is 'A', 'CNAME', or 'NS')
    const isConfigured =
      domainConfig.configuredBy === "A" ||
      domainConfig.configuredBy === "CNAME" ||
      domainConfig.configuredBy === "NS";
    const hasConfigError =
      !!data.error ||
      data.misconfigured === true ||
      domainConfig.misconfigured === true ||
      !isConfigured; // Not pointing to Vercel
    const hasPendingVerification = verification.length > 0;
    const isFullyVerified =
      data.verified === true && !hasConfigError && !hasPendingVerification;

    console.log("[DBG][vercel] Domain check:", {
      domain: normalizedDomain,
      verified: data.verified,
      configuredBy: domainConfig.configuredBy,
      misconfigured: domainConfig.misconfigured,
      hasError: !!data.error,
      hasConfigError,
      hasPendingVerification,
      isFullyVerified,
    });

    return {
      exists: true,
      verified: isFullyVerified,
      verification,
    };
  } catch (error) {
    console.error("[DBG][vercel] Error getting domain status:", error);
    return {
      exists: false,
      verified: false,
      error: "Failed to connect to Vercel API",
    };
  }
}

/**
 * Verify a domain (triggers Vercel to re-check DNS)
 */
export async function verifyDomain(domain: string): Promise<{
  success: boolean;
  verified: boolean;
  error?: string;
}> {
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!projectId) {
    return {
      success: false,
      verified: false,
      error: "Vercel integration not configured",
    };
  }

  const normalizedDomain = domain.toLowerCase().trim();
  console.log("[DBG][vercel] Verifying domain:", normalizedDomain);

  try {
    const response = await fetch(
      `${VERCEL_API_BASE}/v9/projects/${projectId}/domains/${normalizedDomain}/verify?${getTeamParam()}`,
      {
        method: "POST",
        headers: getHeaders(),
      },
    );

    if (!response.ok) {
      const data = await response.json();
      console.error("[DBG][vercel] Domain verification failed:", data);
      return { success: false, verified: false, error: data.error?.message };
    }

    const data = (await response.json()) as VercelDomainConfig;
    console.log("[DBG][vercel] Domain verification result:", data.verified);

    return {
      success: true,
      verified: data.verified,
    };
  } catch (error) {
    console.error("[DBG][vercel] Error verifying domain:", error);
    return {
      success: false,
      verified: false,
      error: "Failed to connect to Vercel API",
    };
  }
}

/**
 * List all domains for the project
 */
export async function listProjectDomains(): Promise<{
  success: boolean;
  domains?: Array<{ name: string; verified: boolean }>;
  error?: string;
}> {
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!projectId) {
    return { success: false, error: "Vercel integration not configured" };
  }

  try {
    const response = await fetch(
      `${VERCEL_API_BASE}/v9/projects/${projectId}/domains?${getTeamParam()}`,
      {
        method: "GET",
        headers: getHeaders(),
      },
    );

    if (!response.ok) {
      const data = await response.json();
      return { success: false, error: data.error?.message };
    }

    const data = (await response.json()) as VercelDomainListResponse;

    return {
      success: true,
      domains: data.domains.map((d) => ({
        name: d.name,
        verified: d.verified,
      })),
    };
  } catch (error) {
    console.error("[DBG][vercel] Error listing domains:", error);
    return { success: false, error: "Failed to connect to Vercel API" };
  }
}
