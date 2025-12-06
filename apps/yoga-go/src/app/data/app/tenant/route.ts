/**
 * Tenant Management API
 *
 * GET /data/app/tenant - Get current user's tenant (if expert)
 * POST /data/app/tenant - Create tenant for expert
 * PUT /data/app/tenant - Update tenant (add/remove domains, update settings)
 *
 * Integrates with Vercel API for automatic SSL certificate provisioning.
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById } from '@/lib/repositories/userRepository';
import {
  getTenantByExpertId,
  createTenant,
  updateTenant,
  addDomainToTenant,
  removeDomainFromTenant,
} from '@/lib/repositories/tenantRepository';
import { getExpertById } from '@/lib/repositories/expertRepository';
import {
  addDomainToVercel,
  removeDomainFromVercel,
  getDomainStatus,
  verifyDomain,
} from '@/lib/vercel';
import type { ApiResponse, Tenant } from '@/types';

// Extended response type to include domain verification info
interface TenantWithVerification extends Tenant {
  domainVerification?: {
    verified: boolean;
    records?: Array<{
      type: 'TXT' | 'CNAME';
      name: string;
      value: string;
    }>;
  };
}

/**
 * GET - Get tenant for authenticated expert
 */
export async function GET(): Promise<NextResponse<ApiResponse<Tenant | null>>> {
  try {
    const session = await getSession();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserById(session.user.cognitoSub);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Check if user is an expert
    if (!user.expertProfile) {
      return NextResponse.json({ success: false, error: 'Not an expert' }, { status: 403 });
    }

    const tenant = await getTenantByExpertId(user.expertProfile);

    console.log(
      '[DBG][tenant-api] GET tenant for expert:',
      user.expertProfile,
      tenant ? 'found' : 'not found'
    );

    return NextResponse.json({
      success: true,
      data: tenant,
    });
  } catch (error) {
    console.error('[DBG][tenant-api] GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch tenant' }, { status: 500 });
  }
}

/**
 * POST - Create tenant for expert
 */
export async function POST(request: Request): Promise<NextResponse<ApiResponse<Tenant>>> {
  try {
    const session = await getSession();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserById(session.user.cognitoSub);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    if (!user.expertProfile) {
      return NextResponse.json({ success: false, error: 'Not an expert' }, { status: 403 });
    }

    // Check if tenant already exists
    const existingTenant = await getTenantByExpertId(user.expertProfile);
    if (existingTenant) {
      return NextResponse.json({ success: false, error: 'Tenant already exists' }, { status: 409 });
    }

    // Get expert data for defaults
    const expert = await getExpertById(user.expertProfile);
    if (!expert) {
      return NextResponse.json({ success: false, error: 'Expert not found' }, { status: 404 });
    }

    const body = await request.json();

    // Create tenant in DynamoDB
    const tenant = await createTenant({
      id: user.expertProfile,
      name: body.name || expert.name,
      slug: user.expertProfile,
      expertId: user.expertProfile,
      primaryDomain: body.primaryDomain,
      additionalDomains: body.additionalDomains || [],
      featuredOnPlatform: body.featuredOnPlatform ?? true,
      status: 'active',
    });

    console.log('[DBG][tenant-api] Created tenant:', tenant.id);

    // Add domain to Vercel for SSL provisioning
    let domainVerification: TenantWithVerification['domainVerification'];
    if (body.primaryDomain) {
      const vercelResult = await addDomainToVercel(body.primaryDomain);
      if (vercelResult.success) {
        console.log(
          '[DBG][tenant-api] Added domain to Vercel:',
          body.primaryDomain,
          'verified:',
          vercelResult.verified
        );
        domainVerification = {
          verified: vercelResult.verified || false,
          records: vercelResult.verification,
        };
      } else {
        console.warn('[DBG][tenant-api] Vercel domain add failed:', vercelResult.error);
        // Continue anyway - domain is saved in DynamoDB, Vercel can be retried
      }
    }

    const response: TenantWithVerification = {
      ...tenant,
      domainVerification,
    };

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('[DBG][tenant-api] POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create tenant' }, { status: 500 });
  }
}

/**
 * PUT - Update tenant (add/remove domains, update settings)
 */
export async function PUT(request: Request): Promise<NextResponse<ApiResponse<Tenant>>> {
  try {
    const session = await getSession();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserById(session.user.cognitoSub);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    if (!user.expertProfile) {
      return NextResponse.json({ success: false, error: 'Not an expert' }, { status: 403 });
    }

    const tenant = await getTenantByExpertId(user.expertProfile);
    if (!tenant) {
      return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 });
    }

    const body = await request.json();
    const { action } = body;

    let updatedTenant: Tenant;
    let domainVerification: TenantWithVerification['domainVerification'];

    switch (action) {
      case 'add_domain': {
        if (!body.domain) {
          return NextResponse.json(
            { success: false, error: 'Domain is required' },
            { status: 400 }
          );
        }

        // Add to Vercel first for SSL provisioning
        const vercelResult = await addDomainToVercel(body.domain);
        if (!vercelResult.success) {
          console.error('[DBG][tenant-api] Vercel add domain failed:', vercelResult.error);
          return NextResponse.json(
            { success: false, error: vercelResult.error || 'Failed to add domain to Vercel' },
            { status: 400 }
          );
        }

        // Add to DynamoDB
        updatedTenant = await addDomainToTenant(tenant.id, body.domain);
        console.log(
          '[DBG][tenant-api] Added domain:',
          body.domain,
          'verified:',
          vercelResult.verified
        );

        domainVerification = {
          verified: vercelResult.verified || false,
          records: vercelResult.verification,
        };
        break;
      }

      case 'remove_domain': {
        if (!body.domain) {
          return NextResponse.json(
            { success: false, error: 'Domain is required' },
            { status: 400 }
          );
        }

        // Protect the default myyoga.guru subdomain
        const normalizedDomain = body.domain.toLowerCase();
        const defaultSubdomain = `${tenant.slug}.myyoga.guru`;
        if (normalizedDomain === defaultSubdomain) {
          return NextResponse.json(
            { success: false, error: 'Cannot remove your default myyoga.guru subdomain' },
            { status: 400 }
          );
        }

        // Protect primary domain (it's the auto-generated subdomain)
        if (normalizedDomain === tenant.primaryDomain.toLowerCase()) {
          return NextResponse.json(
            { success: false, error: 'Cannot remove your primary domain' },
            { status: 400 }
          );
        }

        // Remove from Vercel
        const removeResult = await removeDomainFromVercel(body.domain);
        if (!removeResult.success) {
          console.warn('[DBG][tenant-api] Vercel remove domain failed:', removeResult.error);
          // Continue anyway - remove from DynamoDB
        }

        // Remove from DynamoDB
        updatedTenant = await removeDomainFromTenant(tenant.id, body.domain);
        console.log('[DBG][tenant-api] Removed domain:', body.domain);
        break;
      }

      case 'check_domain': {
        // Check domain verification status in Vercel
        if (!body.domain) {
          return NextResponse.json(
            { success: false, error: 'Domain is required' },
            { status: 400 }
          );
        }

        const status = await getDomainStatus(body.domain);
        console.log('[DBG][tenant-api] Domain status:', body.domain, status);

        return NextResponse.json({
          success: true,
          data: {
            ...tenant,
            domainVerification: {
              verified: status.verified,
              records: status.verification,
            },
          },
        });
      }

      case 'verify_domain': {
        // Trigger Vercel to re-check DNS for domain
        if (!body.domain) {
          return NextResponse.json(
            { success: false, error: 'Domain is required' },
            { status: 400 }
          );
        }

        const verifyResult = await verifyDomain(body.domain);
        console.log('[DBG][tenant-api] Verify domain result:', body.domain, verifyResult);

        if (!verifyResult.success) {
          return NextResponse.json(
            { success: false, error: verifyResult.error || 'Verification failed' },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          data: {
            ...tenant,
            domainVerification: {
              verified: verifyResult.verified,
            },
          },
        });
      }

      case 'update':
        updatedTenant = await updateTenant(tenant.id, {
          name: body.name,
          featuredOnPlatform: body.featuredOnPlatform,
          status: body.status,
        });
        console.log('[DBG][tenant-api] Updated tenant:', tenant.id);
        break;

      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    const response: TenantWithVerification = {
      ...updatedTenant,
      domainVerification,
    };

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('[DBG][tenant-api] PUT error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update tenant';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
