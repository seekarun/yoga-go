import * as cdk from 'aws-cdk-lib';
import * as route53 from 'aws-cdk-lib/aws-route53';
import type { Construct } from 'constructs';

/**
 * App domain configuration for Route53.
 */
export interface AppDomainConfig {
  /** Primary domain (e.g., 'myyoga.guru') */
  domain: string;
  /** Additional domains (e.g., ['*.myyoga.guru']) - kept for future use */
  alternativeDomains?: string[];
}

export interface SharedInfraStackProps extends cdk.StackProps {
  /**
   * List of app domains to create hosted zones for.
   *
   * Example:
   * ```
   * appDomains: [
   *   { domain: 'myyoga.guru', alternativeDomains: ['*.myyoga.guru'] },
   * ]
   * ```
   */
  appDomains: AppDomainConfig[];
}

/**
 * Shared Infrastructure Stack (Vercel-optimized)
 *
 * Contains resources shared across all applications:
 * - Route53 Hosted Zones (for DNS management and SES verification)
 *
 * Note: Since we use Vercel for hosting, we no longer need:
 * - VPC, ALB, ECS Cluster, EC2, Security Groups, ACM Certificates
 *
 * Vercel handles:
 * - SSL certificates (automatic)
 * - Load balancing
 * - CDN/Edge network
 * - Wildcard subdomains (Pro plan)
 */
export class SharedInfraStack extends cdk.Stack {
  // Exported resources for app stacks to use
  public readonly hostedZones: Map<string, route53.IHostedZone> = new Map();

  constructor(scope: Construct, id: string, props: SharedInfraStackProps) {
    super(scope, id, props);

    // ========================================
    // Route53 Hosted Zones for all apps
    // ========================================
    // Required for:
    // - SES email identity verification (DKIM, SPF, DMARC)
    // - Custom DNS records if needed
    // - Mail server records (MX, mail.domain)
    props.appDomains.forEach((appDomain, index) => {
      const hostedZone = new route53.HostedZone(this, `HostedZone${index}`, {
        zoneName: appDomain.domain,
        comment: `Hosted zone for ${appDomain.domain} - managed by CDK`,
      });

      this.hostedZones.set(appDomain.domain, hostedZone);

      // Output hosted zone ID for reference
      new cdk.CfnOutput(this, `HostedZoneId${index}`, {
        value: hostedZone.hostedZoneId,
        description: `Route53 Hosted Zone ID for ${appDomain.domain}`,
        exportName: `SharedHostedZoneId-${appDomain.domain.replace(/\./g, '-')}`,
      });

      new cdk.CfnOutput(this, `NameServers${index}`, {
        value: cdk.Fn.join(', ', hostedZone.hostedZoneNameServers || []),
        description: `Nameservers for ${appDomain.domain} - update at your registrar`,
      });
    });
  }
}
