/**
 * Cloudflare DNS Management Library
 *
 * Manages DNS zones and records via Cloudflare API v4.
 * Used for the "Cloudflare NS" flow where users change nameservers
 * to Cloudflare, and we manage all DNS records automatically.
 *
 * API Docs: https://developers.cloudflare.com/api/
 */

const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

// --- Types ---

interface CloudflareApiResponse<T> {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: string[];
  result: T;
}

interface CloudflareZone {
  id: string;
  name: string;
  status: 'pending' | 'active' | 'moved' | 'deleted' | 'deactivated';
  name_servers: string[];
  type: 'full' | 'partial';
}

interface CloudflareDnsRecord {
  id: string;
  type: 'A' | 'AAAA' | 'CNAME' | 'TXT' | 'MX';
  name: string;
  content: string;
  ttl: number;
  priority?: number;
  proxied?: boolean;
}

// --- Result Types ---

export interface CreateZoneResult {
  success: boolean;
  zoneId?: string;
  nameservers?: string[];
  status?: string;
  error?: string;
}

export interface CheckNsResult {
  success: boolean;
  verified: boolean;
  status?: string;
  error?: string;
}

export interface CreateRecordsResult {
  success: boolean;
  recordIds?: {
    aRecord?: string;
    wwwCname?: string;
    mxRecord?: string;
    spfTxt?: string;
    dkim1Cname?: string;
    dkim2Cname?: string;
    dkim3Cname?: string;
  };
  errors?: string[];
}

// --- Helper Functions ---

function getHeaders(): HeadersInit {
  const token = process.env.CLOUDFLARE_DNS_API_TOKEN;
  if (!token) {
    throw new Error('CLOUDFLARE_DNS_API_TOKEN environment variable is required');
  }
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function getAccountId(): string {
  const accountId = process.env.CF_ACCOUNT_ID;
  if (!accountId) {
    throw new Error('CF_ACCOUNT_ID environment variable is required');
  }
  return accountId;
}

// --- Zone Management ---

/**
 * Create a new Cloudflare zone for a domain
 * This is called when user selects Cloudflare NS management
 */
export async function createZone(domain: string): Promise<CreateZoneResult> {
  console.log('[DBG][cloudflare-dns] Creating zone for domain:', domain);

  try {
    const response = await fetch(`${CF_API_BASE}/zones`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        name: domain,
        account: { id: getAccountId() },
        type: 'full', // Full setup (NS change required)
        jump_start: false, // Don't auto-scan DNS records
      }),
    });

    const data: CloudflareApiResponse<CloudflareZone> = await response.json();

    if (!data.success) {
      const error = data.errors[0]?.message || 'Failed to create zone';
      console.error('[DBG][cloudflare-dns] Create zone failed:', error);
      return { success: false, error };
    }

    console.log('[DBG][cloudflare-dns] Zone created:', data.result.id);

    return {
      success: true,
      zoneId: data.result.id,
      nameservers: data.result.name_servers,
      status: data.result.status,
    };
  } catch (error) {
    console.error('[DBG][cloudflare-dns] Error creating zone:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to connect to Cloudflare API',
    };
  }
}

/**
 * Check if nameservers have propagated
 * Called periodically to detect when user has updated NS at registrar
 */
export async function checkNameserverPropagation(zoneId: string): Promise<CheckNsResult> {
  console.log('[DBG][cloudflare-dns] Checking NS propagation for zone:', zoneId);

  try {
    const response = await fetch(`${CF_API_BASE}/zones/${zoneId}`, {
      method: 'GET',
      headers: getHeaders(),
    });

    const data: CloudflareApiResponse<CloudflareZone> = await response.json();

    if (!data.success) {
      return { success: false, verified: false, error: data.errors[0]?.message };
    }

    const verified = data.result.status === 'active';
    console.log('[DBG][cloudflare-dns] Zone status:', data.result.status, 'verified:', verified);

    return {
      success: true,
      verified,
      status: data.result.status,
    };
  } catch (error) {
    console.error('[DBG][cloudflare-dns] Error checking NS:', error);
    return { success: false, verified: false, error: 'Failed to check nameserver status' };
  }
}

/**
 * Create all required DNS records for Vercel hosting and SES email
 * Called after nameservers are verified
 */
export async function createAllDnsRecords(
  zoneId: string,
  domain: string,
  dkimTokens: string[]
): Promise<CreateRecordsResult> {
  console.log('[DBG][cloudflare-dns] Creating DNS records for zone:', zoneId);

  const recordIds: CreateRecordsResult['recordIds'] = {};
  const errors: string[] = [];

  // Define all records to create
  type RecordKey =
    | 'aRecord'
    | 'wwwCname'
    | 'mxRecord'
    | 'spfTxt'
    | 'dkim1Cname'
    | 'dkim2Cname'
    | 'dkim3Cname';

  const records: Array<{
    type: 'A' | 'CNAME' | 'MX' | 'TXT';
    name: string;
    content: string;
    priority?: number;
    key: RecordKey;
  }> = [
    // Vercel hosting
    { type: 'A', name: '@', content: '76.76.21.21', key: 'aRecord' },
    { type: 'CNAME', name: 'www', content: 'cname.vercel-dns.com', key: 'wwwCname' },

    // SES Email receiving
    {
      type: 'MX',
      name: '@',
      content: 'inbound-smtp.us-west-2.amazonaws.com',
      priority: 10,
      key: 'mxRecord',
    },

    // SPF for email sending
    { type: 'TXT', name: '@', content: 'v=spf1 include:amazonses.com ~all', key: 'spfTxt' },
  ];

  // Add DKIM records
  dkimTokens.forEach((token, index) => {
    records.push({
      type: 'CNAME',
      name: `${token}._domainkey`,
      content: `${token}.dkim.amazonses.com`,
      key: `dkim${index + 1}Cname` as RecordKey,
    });
  });

  // Create records in parallel
  const results = await Promise.allSettled(
    records.map(async record => {
      try {
        const response = await fetch(`${CF_API_BASE}/zones/${zoneId}/dns_records`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            type: record.type,
            name: record.name === '@' ? domain : `${record.name}.${domain}`,
            content: record.content,
            ttl: 3600, // 1 hour
            priority: record.priority,
            proxied: false, // DNS only mode (grey cloud)
          }),
        });

        const data: CloudflareApiResponse<CloudflareDnsRecord> = await response.json();

        if (!data.success) {
          throw new Error(data.errors[0]?.message || 'Failed to create record');
        }

        return { key: record.key, id: data.result.id };
      } catch (err) {
        throw { key: record.key, error: err instanceof Error ? err.message : 'Unknown error' };
      }
    })
  );

  // Process results
  results.forEach(result => {
    if (result.status === 'fulfilled') {
      recordIds[result.value.key] = result.value.id;
    } else {
      const reason = result.reason as { key: string; error: string };
      errors.push(`${reason.key}: ${reason.error}`);
    }
  });

  console.log(
    '[DBG][cloudflare-dns] Created records:',
    Object.keys(recordIds).length,
    'errors:',
    errors.length
  );

  return {
    success: errors.length === 0,
    recordIds,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Delete a DNS record by ID
 */
export async function deleteDnsRecord(
  zoneId: string,
  recordId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${CF_API_BASE}/zones/${zoneId}/dns_records/${recordId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });

    const data = await response.json();

    if (!data.success) {
      return { success: false, error: data.errors[0]?.message };
    }

    return { success: true };
  } catch (_error) {
    return { success: false, error: 'Failed to delete DNS record' };
  }
}

/**
 * Delete all DNS records in a zone
 */
export async function deleteAllDnsRecords(
  zoneId: string
): Promise<{ success: boolean; deleted: number; errors: string[] }> {
  console.log('[DBG][cloudflare-dns] Deleting all DNS records for zone:', zoneId);

  const listResult = await listDnsRecords(zoneId);
  if (!listResult.success || !listResult.records) {
    return { success: false, deleted: 0, errors: [listResult.error || 'Failed to list records'] };
  }

  const errors: string[] = [];
  let deleted = 0;

  for (const record of listResult.records) {
    const result = await deleteDnsRecord(zoneId, record.id);
    if (result.success) {
      deleted++;
    } else {
      errors.push(`${record.name}: ${result.error}`);
    }
  }

  console.log('[DBG][cloudflare-dns] Deleted', deleted, 'records, errors:', errors.length);

  return { success: errors.length === 0, deleted, errors };
}

/**
 * Delete a zone (cleanup when domain is removed)
 */
export async function deleteZone(zoneId: string): Promise<{ success: boolean; error?: string }> {
  console.log('[DBG][cloudflare-dns] Deleting zone:', zoneId);

  try {
    const response = await fetch(`${CF_API_BASE}/zones/${zoneId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });

    const data = await response.json();

    if (!data.success) {
      return { success: false, error: data.errors[0]?.message };
    }

    console.log('[DBG][cloudflare-dns] Zone deleted:', zoneId);
    return { success: true };
  } catch (error) {
    console.error('[DBG][cloudflare-dns] Error deleting zone:', error);
    return { success: false, error: 'Failed to delete zone' };
  }
}

/**
 * List all DNS records in a zone
 */
export async function listDnsRecords(zoneId: string): Promise<{
  success: boolean;
  records?: Array<{
    id: string;
    type: string;
    name: string;
    content: string;
    priority?: number;
    ttl: number;
  }>;
  error?: string;
}> {
  try {
    const response = await fetch(`${CF_API_BASE}/zones/${zoneId}/dns_records`, {
      method: 'GET',
      headers: getHeaders(),
    });

    const data: CloudflareApiResponse<CloudflareDnsRecord[]> = await response.json();

    if (!data.success) {
      return { success: false, error: data.errors[0]?.message };
    }

    return {
      success: true,
      records: data.result.map(r => ({
        id: r.id,
        type: r.type,
        name: r.name,
        content: r.content,
        priority: r.priority,
        ttl: r.ttl,
      })),
    };
  } catch (_error) {
    return { success: false, error: 'Failed to list DNS records' };
  }
}

/**
 * Get zone details
 */
export async function getZone(zoneId: string): Promise<{
  success: boolean;
  zone?: {
    id: string;
    name: string;
    status: string;
    nameservers: string[];
  };
  error?: string;
}> {
  try {
    const response = await fetch(`${CF_API_BASE}/zones/${zoneId}`, {
      method: 'GET',
      headers: getHeaders(),
    });

    const data: CloudflareApiResponse<CloudflareZone> = await response.json();

    if (!data.success) {
      return { success: false, error: data.errors[0]?.message };
    }

    return {
      success: true,
      zone: {
        id: data.result.id,
        name: data.result.name,
        status: data.result.status,
        nameservers: data.result.name_servers,
      },
    };
  } catch (_error) {
    return { success: false, error: 'Failed to get zone' };
  }
}
