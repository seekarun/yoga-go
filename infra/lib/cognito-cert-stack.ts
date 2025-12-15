import * as cdk from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import type { Construct } from 'constructs';

/**
 * Cognito Certificate Stack (us-east-1)
 *
 * Creates an ACM certificate for the Cognito custom domain.
 * This stack MUST be deployed in us-east-1 because Cognito custom
 * domains require certificates in that region.
 *
 * DNS validation is used - you'll need to manually add the CNAME
 * records to Vercel DNS to complete validation.
 *
 * Deployment steps:
 * 1. Deploy this stack: cdk deploy CognitoCertStack
 * 2. Check ACM console for DNS validation CNAME records
 * 3. Add the CNAME records to Vercel DNS
 * 4. Wait for certificate to show "Issued" status
 * 5. Deploy YogaGoStack with certificate ARN from output
 */
export interface CognitoCertStackProps extends cdk.StackProps {
  readonly domainName: string;
}

export class CognitoCertStack extends cdk.Stack {
  public readonly certificateArn: string;

  constructor(scope: Construct, id: string, props: CognitoCertStackProps) {
    super(scope, id, props);

    // Create certificate with DNS validation
    // The validation records must be added to Vercel DNS manually
    const certificate = new acm.Certificate(this, 'CognitoCert', {
      domainName: props.domainName,
      validation: acm.CertificateValidation.fromDns(),
      certificateName: `cognito-${props.domainName}`,
    });

    this.certificateArn = certificate.certificateArn;

    // Output the certificate ARN for use in YogaGoStack
    new cdk.CfnOutput(this, 'CertificateArn', {
      value: certificate.certificateArn,
      description: 'Certificate ARN - use this when deploying YogaGoStack',
      exportName: 'CognitoCertificateArn',
    });

    // Output instructions
    new cdk.CfnOutput(this, 'NextSteps', {
      value: `
1. Go to ACM Console in us-east-1
2. Find certificate for ${props.domainName}
3. Copy the DNS validation CNAME record
4. Add CNAME to Vercel DNS
5. Wait for status to change to "Issued"
6. Deploy YogaGoStack: cdk deploy YogaGoStack -c cognitoCertificateArn=${certificate.certificateArn}
      `.trim(),
      description: 'Next steps after deployment',
    });
  }
}
