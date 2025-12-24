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
import {
  createDomainIdentity,
  getDomainVerificationStatus,
  getDnsRecordsForDomain,
  verifyAllDnsRecords,
  deleteDomainIdentity,
} from '@/lib/ses';
import {
  createZone,
  checkNameserverPropagation,
  createAllDnsRecords,
  deleteAllDnsRecords,
  deleteZone,
} from '@/lib/cloudflare-dns';
import type {
  ApiResponse,
  Tenant,
  TenantEmailConfig,
  TenantDnsRecord,
  TenantBranding,
  CloudflareDnsConfig,
} from '@/types';

// Domain verification status for a single domain
interface DomainVerificationStatus {
  verified: boolean;
  records?: Array<{
    type: 'TXT' | 'CNAME';
    name: string;
    value: string;
  }>;
}

// Extended response type to include domain verification info
interface TenantWithVerification extends Tenant {
  domainVerification?: DomainVerificationStatus;
  // Verification status for all domains (keyed by domain name)
  domainsVerification?: Record<string, DomainVerificationStatus>;
  // Email setup response fields
  emailDnsRecords?: TenantDnsRecord[];
  emailVerificationStatus?: {
    sesVerified: boolean;
    dkimVerified: boolean;
    mxVerified: boolean;
    spfVerified: boolean;
    allVerified: boolean;
  };
}

/**
 * GET - Get tenant for authenticated expert
 */
export async function GET(): Promise<NextResponse<ApiResponse<TenantWithVerification | null>>> {
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

    if (!tenant) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    // Fetch domain verification status for all domains from Vercel
    const allDomains = [tenant.primaryDomain, ...(tenant.additionalDomains || [])].filter(
      (d): d is string => !!d
    );
    const domainsVerification: Record<string, DomainVerificationStatus> = {};

    // Check verification status for each domain in parallel
    await Promise.all(
      allDomains.map(async domain => {
        try {
          const status = await getDomainStatus(domain);
          domainsVerification[domain] = {
            verified: status.verified,
            records: status.verification,
          };
        } catch (err) {
          console.error('[DBG][tenant-api] Error checking domain status:', domain, err);
          // Default to unverified on error
          domainsVerification[domain] = { verified: false };
        }
      })
    );

    console.log('[DBG][tenant-api] Domain verification statuses:', domainsVerification);

    const response: TenantWithVerification = {
      ...tenant,
      domainsVerification,
    };

    return NextResponse.json({
      success: true,
      data: response,
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

    // Check if tenant/expert already exists (merged entity)
    const existingTenant = await getTenantByExpertId(user.expertProfile);
    if (existingTenant) {
      return NextResponse.json({ success: false, error: 'Tenant already exists' }, { status: 409 });
    }

    const body = await request.json();

    // Always include the myyoga.guru subdomain so expertId.myyoga.guru works
    const myYogaGuruSubdomain = `${user.expertProfile}.myyoga.guru`;
    const additionalDomains = body.additionalDomains || [];

    // If user provided a custom domain, use that as primary and add subdomain to additional
    // Otherwise, use the subdomain as primary
    const primaryDomain = body.primaryDomain || myYogaGuruSubdomain;
    if (body.primaryDomain && !additionalDomains.includes(myYogaGuruSubdomain)) {
      additionalDomains.push(myYogaGuruSubdomain);
    }

    // Create tenant in DynamoDB (Expert and Tenant are now merged)
    const tenant = await createTenant({
      id: user.expertProfile,
      userId: session.user.cognitoSub,
      name: body.name || user.profile?.name || 'Expert',
      primaryDomain,
      additionalDomains,
      featuredOnPlatform: body.featuredOnPlatform ?? true,
      status: 'active',
    });

    console.log('[DBG][tenant-api] Created tenant:', tenant.id);

    // Add domains to Vercel for SSL provisioning
    let domainVerification: TenantWithVerification['domainVerification'];

    // Add the myyoga.guru subdomain to Vercel (always)
    try {
      const subdomainResult = await addDomainToVercel(myYogaGuruSubdomain);
      console.log(
        '[DBG][tenant-api] Added subdomain to Vercel:',
        myYogaGuruSubdomain,
        'success:',
        subdomainResult.success
      );
    } catch (err) {
      console.warn('[DBG][tenant-api] Failed to add subdomain to Vercel:', err);
    }

    // Add custom domain to Vercel if provided
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
        if (tenant.primaryDomain && normalizedDomain === tenant.primaryDomain.toLowerCase()) {
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

      case 'enable_domain_email': {
        // Enable email for the custom domain via SES
        // Requires a verified custom domain in Vercel first
        const emailDomain = body.domain || tenant.primaryDomain;

        if (!emailDomain) {
          return NextResponse.json(
            { success: false, error: 'No domain configured. Add a custom domain first.' },
            { status: 400 }
          );
        }

        // Don't allow enabling email for myyoga.guru subdomains
        if (emailDomain.endsWith('.myyoga.guru') || emailDomain === 'myyoga.guru') {
          return NextResponse.json(
            { success: false, error: 'Cannot enable custom email for myyoga.guru subdomains' },
            { status: 400 }
          );
        }

        console.log('[DBG][tenant-api] Enabling domain email for:', emailDomain);

        try {
          // Create SES identity for the domain
          const sesResult = await createDomainIdentity(emailDomain);

          // Get user's personal email for forwarding
          const expert = await getExpertById(user.expertProfile);
          const forwardToEmail =
            body.forwardToEmail ||
            expert?.platformPreferences?.forwardingEmail ||
            user.profile?.email ||
            '';

          // Update tenant with email config
          const emailConfig: TenantEmailConfig = {
            domainEmail: `contact@${emailDomain}`,
            sesVerificationStatus: 'pending',
            sesDkimTokens: sesResult.dkimTokens,
            dkimVerified: false,
            mxVerified: false,
            forwardToEmail,
            forwardingEnabled: true,
            enabledAt: new Date().toISOString(),
          };

          updatedTenant = await updateTenant(tenant.id, { emailConfig });

          // Generate DNS records for the expert to add
          const emailDnsRecords = getDnsRecordsForDomain(emailDomain, sesResult.dkimTokens);

          console.log('[DBG][tenant-api] Email enabled for domain:', emailDomain);

          const response: TenantWithVerification = {
            ...updatedTenant,
            emailDnsRecords,
          };

          return NextResponse.json({
            success: true,
            data: response,
            message: 'Email enabled. Add the DNS records shown to your domain registrar.',
          });
        } catch (error) {
          console.error('[DBG][tenant-api] Failed to enable email:', error);
          return NextResponse.json(
            {
              success: false,
              error: error instanceof Error ? error.message : 'Failed to enable email',
            },
            { status: 500 }
          );
        }
      }

      case 'verify_domain_email': {
        // Verify DNS records and SES status for domain email
        const emailDomain = body.domain || tenant.primaryDomain;

        if (!tenant.emailConfig) {
          return NextResponse.json(
            { success: false, error: 'Email not enabled for this domain' },
            { status: 400 }
          );
        }

        console.log('[DBG][tenant-api] Verifying domain email for:', emailDomain);

        try {
          // Check all DNS records
          const dnsStatus = await verifyAllDnsRecords(emailDomain);

          // Map SES status to our type
          const sesVerificationStatus = dnsStatus.allVerified
            ? 'verified'
            : dnsStatus.dkimVerified
              ? 'pending'
              : 'pending';

          // Update tenant with verification status
          const emailConfig: TenantEmailConfig = {
            ...tenant.emailConfig,
            sesVerificationStatus,
            dkimVerified: dnsStatus.dkimVerified,
            dkimStatus: dnsStatus.dkimStatus,
            mxVerified: dnsStatus.mxVerified,
            spfVerified: dnsStatus.spfVerified,
            ...(dnsStatus.allVerified && { verifiedAt: new Date().toISOString() }),
          };

          updatedTenant = await updateTenant(tenant.id, { emailConfig });

          console.log('[DBG][tenant-api] Domain email verification result:', {
            domain: emailDomain,
            allVerified: dnsStatus.allVerified,
          });

          const response: TenantWithVerification = {
            ...updatedTenant,
            emailVerificationStatus: {
              sesVerified: dnsStatus.dkimVerified,
              dkimVerified: dnsStatus.dkimVerified,
              mxVerified: dnsStatus.mxVerified,
              spfVerified: dnsStatus.spfVerified,
              allVerified: dnsStatus.allVerified,
            },
          };

          return NextResponse.json({
            success: true,
            data: response,
            message: dnsStatus.allVerified
              ? 'Email verified and ready to use!'
              : 'Some DNS records are still pending verification.',
          });
        } catch (error) {
          console.error('[DBG][tenant-api] Failed to verify email:', error);
          return NextResponse.json(
            {
              success: false,
              error: error instanceof Error ? error.message : 'Failed to verify email',
            },
            { status: 500 }
          );
        }
      }

      case 'get_email_dns_records': {
        // Get DNS records needed for domain email (if already enabled)
        if (!tenant.emailConfig?.sesDkimTokens) {
          return NextResponse.json(
            { success: false, error: 'Email not enabled for this domain' },
            { status: 400 }
          );
        }

        const emailDomain = body.domain || tenant.primaryDomain;
        const emailDnsRecords = getDnsRecordsForDomain(
          emailDomain,
          tenant.emailConfig.sesDkimTokens
        );

        return NextResponse.json({
          success: true,
          data: {
            ...tenant,
            emailDnsRecords,
          },
        });
      }

      case 'disable_domain_email': {
        // Disable email for the custom domain
        const emailDomain = body.domain || tenant.primaryDomain;

        if (!tenant.emailConfig) {
          return NextResponse.json(
            { success: false, error: 'Email not enabled for this domain' },
            { status: 400 }
          );
        }

        console.log('[DBG][tenant-api] Disabling domain email for:', emailDomain);

        try {
          // Delete SES identity
          await deleteDomainIdentity(emailDomain);

          // Clear email config from tenant
          updatedTenant = await updateTenant(tenant.id, { emailConfig: undefined });

          console.log('[DBG][tenant-api] Email disabled for domain:', emailDomain);

          return NextResponse.json({
            success: true,
            data: updatedTenant,
            message: 'Domain email disabled. You can remove the DNS records from your registrar.',
          });
        } catch (error) {
          console.error('[DBG][tenant-api] Failed to disable email:', error);
          return NextResponse.json(
            {
              success: false,
              error: error instanceof Error ? error.message : 'Failed to disable email',
            },
            { status: 500 }
          );
        }
      }

      case 'update_email_forwarding': {
        // Update forwarding email address
        if (!tenant.emailConfig) {
          return NextResponse.json(
            { success: false, error: 'Email not enabled for this domain' },
            { status: 400 }
          );
        }

        const { forwardToEmail, forwardingEnabled } = body;

        // Validate email if provided
        if (forwardToEmail) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(forwardToEmail)) {
            return NextResponse.json(
              { success: false, error: 'Invalid email format' },
              { status: 400 }
            );
          }
        }

        const emailConfig: TenantEmailConfig = {
          ...tenant.emailConfig,
          forwardToEmail: forwardToEmail ?? tenant.emailConfig.forwardToEmail,
          forwardingEnabled: forwardingEnabled ?? tenant.emailConfig.forwardingEnabled,
        };

        updatedTenant = await updateTenant(tenant.id, { emailConfig });

        console.log('[DBG][tenant-api] Updated email forwarding:', {
          forwardToEmail: emailConfig.forwardToEmail,
          enabled: emailConfig.forwardingEnabled,
        });

        return NextResponse.json({
          success: true,
          data: updatedTenant,
          message: 'Email forwarding settings updated.',
        });
      }

      case 'update_branding': {
        // Update branding settings (favicon, site title, description, OG image)
        const { faviconUrl, siteTitle, siteDescription, ogImage } = body;

        // Build branding object, merging with existing
        const branding: TenantBranding = {
          ...tenant.branding,
          ...(faviconUrl !== undefined && { faviconUrl }),
          ...(siteTitle !== undefined && { siteTitle }),
          ...(siteDescription !== undefined && { siteDescription }),
          ...(ogImage !== undefined && { ogImage }),
        };

        updatedTenant = await updateTenant(tenant.id, { branding });

        console.log('[DBG][tenant-api] Updated branding:', {
          faviconUrl: branding.faviconUrl,
          siteTitle: branding.siteTitle,
        });

        return NextResponse.json({
          success: true,
          data: updatedTenant,
          message: 'Branding settings updated.',
        });
      }

      case 'setup_cloudflare_ns': {
        // Initialize Cloudflare NS management for a domain
        // User will change nameservers to Cloudflare, and we manage DNS automatically
        const cfDomain = body.domain || tenant.primaryDomain;

        if (!cfDomain) {
          return NextResponse.json(
            { success: false, error: 'Domain is required' },
            { status: 400 }
          );
        }

        // Don't allow for myyoga.guru subdomains
        if (cfDomain.endsWith('.myyoga.guru') || cfDomain === 'myyoga.guru') {
          return NextResponse.json(
            { success: false, error: 'Cloudflare NS is only available for custom domains' },
            { status: 400 }
          );
        }

        console.log('[DBG][tenant-api] Setting up Cloudflare NS for:', cfDomain);

        // Create Cloudflare zone
        const zoneResult = await createZone(cfDomain);
        if (!zoneResult.success) {
          console.error('[DBG][tenant-api] Cloudflare zone creation failed:', zoneResult.error);
          return NextResponse.json(
            { success: false, error: zoneResult.error || 'Failed to create Cloudflare zone' },
            { status: 400 }
          );
        }

        // Store Cloudflare config in tenant (including the domain this zone is for)
        const cloudflareDns: CloudflareDnsConfig = {
          method: 'cloudflare',
          domain: cfDomain, // Store the domain so we know which domain this zone is for
          zoneId: zoneResult.zoneId,
          zoneStatus: 'pending',
          nameservers: zoneResult.nameservers,
          zoneCreatedAt: new Date().toISOString(),
        };

        updatedTenant = await updateTenant(tenant.id, { cloudflareDns });

        console.log('[DBG][tenant-api] Cloudflare zone created:', {
          zoneId: zoneResult.zoneId,
          nameservers: zoneResult.nameservers,
        });

        return NextResponse.json({
          success: true,
          data: {
            ...updatedTenant,
            cloudflareSetup: {
              nameservers: zoneResult.nameservers,
              status: 'pending',
              instructions:
                'Update your domain nameservers at your registrar to the values shown above.',
            },
          },
        });
      }

      case 'check_cloudflare_ns': {
        // Check if nameservers have propagated
        if (!tenant.cloudflareDns?.zoneId) {
          return NextResponse.json(
            { success: false, error: 'Cloudflare DNS not configured' },
            { status: 400 }
          );
        }

        console.log('[DBG][tenant-api] Checking Cloudflare NS propagation');

        const nsResult = await checkNameserverPropagation(tenant.cloudflareDns.zoneId);

        if (!nsResult.success) {
          return NextResponse.json(
            { success: false, error: nsResult.error || 'Failed to check NS status' },
            { status: 500 }
          );
        }

        // If NS verified and records not yet created, create them now
        if (nsResult.verified && tenant.cloudflareDns.zoneStatus !== 'active') {
          console.log('[DBG][tenant-api] NS verified, creating DNS records');

          // Use the domain stored in cloudflareDns config (the domain the zone was created for)
          const customDomain = tenant.cloudflareDns.domain || tenant.primaryDomain;
          if (!customDomain) {
            return NextResponse.json(
              { success: false, error: 'Domain not found in Cloudflare config' },
              { status: 400 }
            );
          }
          let dkimTokens: string[] = [];

          // Create SES identity if not already done
          if (!tenant.emailConfig?.sesDkimTokens) {
            try {
              const sesResult = await createDomainIdentity(customDomain);
              dkimTokens = sesResult.dkimTokens;

              // Get forwarding email
              const expert = await getExpertById(user.expertProfile);
              const forwardToEmail =
                expert?.platformPreferences?.forwardingEmail || user.profile?.email || '';

              // Store email config
              const emailConfig: TenantEmailConfig = {
                domainEmail: `contact@${customDomain}`,
                sesVerificationStatus: 'pending',
                sesDkimTokens: dkimTokens,
                dkimVerified: false,
                mxVerified: false,
                forwardToEmail,
                forwardingEnabled: true,
                enabledAt: new Date().toISOString(),
              };
              await updateTenant(tenant.id, { emailConfig });
              console.log('[DBG][tenant-api] SES identity created for:', customDomain);
            } catch (sesError) {
              console.error('[DBG][tenant-api] Failed to create SES identity:', sesError);
              // Continue anyway - DNS records for hosting will still be created
            }
          } else {
            dkimTokens = tenant.emailConfig.sesDkimTokens;
          }

          // Create all DNS records via Cloudflare
          const recordsResult = await createAllDnsRecords(
            tenant.cloudflareDns.zoneId,
            customDomain,
            dkimTokens
          );

          // Add domain to Vercel for SSL
          try {
            await addDomainToVercel(customDomain);
            console.log('[DBG][tenant-api] Domain added to Vercel:', customDomain);
          } catch (vercelError) {
            console.warn('[DBG][tenant-api] Failed to add domain to Vercel:', vercelError);
          }

          // Update tenant with active status and record IDs
          const updatedCloudflareDns: CloudflareDnsConfig = {
            ...tenant.cloudflareDns,
            zoneStatus: 'active',
            nsVerifiedAt: new Date().toISOString(),
            recordIds: recordsResult.recordIds,
            recordsCreatedAt: new Date().toISOString(),
          };

          updatedTenant = await updateTenant(tenant.id, { cloudflareDns: updatedCloudflareDns });

          console.log('[DBG][tenant-api] Cloudflare NS setup complete:', {
            recordsCreated: recordsResult.success,
            errors: recordsResult.errors,
          });

          return NextResponse.json({
            success: true,
            data: {
              ...updatedTenant,
              nsVerified: true,
              recordsCreated: recordsResult.success,
              recordErrors: recordsResult.errors,
            },
            message: recordsResult.success
              ? 'Nameservers verified! All DNS records created automatically.'
              : 'Nameservers verified but some records failed. Check errors.',
          });
        }

        // NS not yet verified
        return NextResponse.json({
          success: true,
          data: {
            ...tenant,
            nsVerified: nsResult.verified,
            zoneStatus: nsResult.status,
          },
          message: nsResult.verified
            ? 'Nameservers verified!'
            : 'Nameservers not yet verified. This can take up to 48 hours.',
        });
      }

      case 'switch_to_manual_dns': {
        // Switch from Cloudflare NS to manual DNS management
        if (!tenant.cloudflareDns?.zoneId) {
          return NextResponse.json(
            { success: false, error: 'Cloudflare DNS not configured' },
            { status: 400 }
          );
        }

        console.log('[DBG][tenant-api] Switching to manual DNS');

        // Delete the Cloudflare zone
        const deleteResult = await deleteZone(tenant.cloudflareDns.zoneId);
        if (!deleteResult.success) {
          console.warn('[DBG][tenant-api] Failed to delete Cloudflare zone:', deleteResult.error);
          // Continue anyway
        }

        // Clear Cloudflare config
        updatedTenant = await updateTenant(tenant.id, { cloudflareDns: undefined });

        console.log('[DBG][tenant-api] Switched to manual DNS');

        return NextResponse.json({
          success: true,
          data: updatedTenant,
          message: 'Switched to manual DNS. Please add DNS records manually at your registrar.',
        });
      }

      case 'recreate_cloudflare_dns': {
        // Recreate DNS records for an existing Cloudflare zone
        // Useful when records were created with wrong domain or need to be refreshed
        if (!tenant.cloudflareDns?.zoneId) {
          return NextResponse.json(
            { success: false, error: 'Cloudflare DNS not configured' },
            { status: 400 }
          );
        }

        // Get the domain - prefer body.domain, then stored domain, then primaryDomain
        const recreateDomain = body.domain || tenant.cloudflareDns.domain;
        if (!recreateDomain) {
          return NextResponse.json(
            { success: false, error: 'Domain is required' },
            { status: 400 }
          );
        }

        console.log('[DBG][tenant-api] Recreating DNS records for domain:', recreateDomain);

        // First, delete all existing DNS records in the zone
        const deleteRecordsResult = await deleteAllDnsRecords(tenant.cloudflareDns.zoneId);
        console.log('[DBG][tenant-api] Deleted existing records:', deleteRecordsResult);

        // Get DKIM tokens from existing email config or create new SES identity
        let dkimTokens: string[] = [];
        if (tenant.emailConfig?.sesDkimTokens) {
          dkimTokens = tenant.emailConfig.sesDkimTokens;
        } else {
          try {
            const sesResult = await createDomainIdentity(recreateDomain);
            dkimTokens = sesResult.dkimTokens;

            // Get forwarding email
            const expert = await getExpertById(user.expertProfile);
            const forwardToEmail =
              expert?.platformPreferences?.forwardingEmail || user.profile?.email || '';

            // Store email config
            const emailConfig: TenantEmailConfig = {
              domainEmail: `contact@${recreateDomain}`,
              sesVerificationStatus: 'pending',
              sesDkimTokens: dkimTokens,
              dkimVerified: false,
              mxVerified: false,
              forwardToEmail,
              forwardingEnabled: true,
              enabledAt: new Date().toISOString(),
            };
            await updateTenant(tenant.id, { emailConfig });
            console.log('[DBG][tenant-api] SES identity created for:', recreateDomain);
          } catch (sesError) {
            console.error('[DBG][tenant-api] Failed to create SES identity:', sesError);
            // Continue anyway
          }
        }

        // Create all DNS records with the correct domain
        const recordsResult = await createAllDnsRecords(
          tenant.cloudflareDns.zoneId,
          recreateDomain,
          dkimTokens
        );

        if (!recordsResult.success) {
          console.error('[DBG][tenant-api] Failed to recreate DNS records:', recordsResult.errors);
        }

        // Add domain to Vercel for SSL
        try {
          await addDomainToVercel(recreateDomain);
          console.log('[DBG][tenant-api] Domain added to Vercel:', recreateDomain);
        } catch (vercelError) {
          console.warn('[DBG][tenant-api] Failed to add domain to Vercel:', vercelError);
        }

        // Update tenant with new record IDs and domain
        const updatedCloudflareDns: CloudflareDnsConfig = {
          ...tenant.cloudflareDns,
          domain: recreateDomain,
          recordIds: recordsResult.recordIds,
          recordsCreatedAt: new Date().toISOString(),
        };

        updatedTenant = await updateTenant(tenant.id, { cloudflareDns: updatedCloudflareDns });

        console.log('[DBG][tenant-api] DNS records recreated for:', recreateDomain);

        return NextResponse.json({
          success: recordsResult.success,
          data: updatedTenant,
          message: recordsResult.success
            ? 'DNS records recreated successfully'
            : `Some records failed: ${recordsResult.errors?.join(', ')}`,
        });
      }

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

/**
 * DELETE - Delete tenant configuration (remove all domains)
 */
export async function DELETE(): Promise<NextResponse<ApiResponse<null>>> {
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

    console.log('[DBG][tenant-api] Deleting tenant for expert:', user.expertProfile);

    // Remove all domains from Vercel
    const allDomains = [tenant.primaryDomain, ...(tenant.additionalDomains || [])].filter(
      (d): d is string => !!d
    );
    for (const domain of allDomains) {
      try {
        const result = await removeDomainFromVercel(domain);
        console.log('[DBG][tenant-api] Removed domain from Vercel:', domain, result.success);
      } catch (err) {
        console.warn('[DBG][tenant-api] Failed to remove domain from Vercel:', domain, err);
        // Continue anyway
      }
    }

    // Delete SES identity if email was enabled
    if (tenant.emailConfig?.domainEmail) {
      const emailDomain = tenant.emailConfig.domainEmail.split('@')[1];
      try {
        await deleteDomainIdentity(emailDomain);
        console.log('[DBG][tenant-api] Deleted SES identity:', emailDomain);
      } catch (err) {
        console.warn('[DBG][tenant-api] Failed to delete SES identity:', err);
      }
    }

    // Delete Cloudflare zone if configured
    if (tenant.cloudflareDns?.zoneId) {
      try {
        await deleteZone(tenant.cloudflareDns.zoneId);
        console.log('[DBG][tenant-api] Deleted Cloudflare zone:', tenant.cloudflareDns.zoneId);
      } catch (err) {
        console.warn('[DBG][tenant-api] Failed to delete Cloudflare zone:', err);
      }
    }

    // Delete tenant from DynamoDB
    const { deleteTenant } = await import('@/lib/repositories/tenantRepository');
    await deleteTenant(tenant.id);

    console.log('[DBG][tenant-api] Tenant deleted:', tenant.id);

    return NextResponse.json({
      success: true,
      data: null,
      message: 'Domain configuration deleted successfully',
    });
  } catch (error) {
    console.error('[DBG][tenant-api] DELETE error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete tenant';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
