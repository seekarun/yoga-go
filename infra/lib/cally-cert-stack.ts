import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import type { Construct } from "constructs";

/**
 * Cally Certificate Stack (us-east-1)
 *
 * Creates an ACM certificate for the Cally Cognito custom domain.
 * This stack MUST be deployed in us-east-1 because Cognito custom
 * domains require certificates in that region.
 *
 * DNS validation is used - you'll need to manually add the CNAME
 * records to Vercel DNS to complete validation.
 *
 * Deployment steps:
 * 1. Deploy this stack: cdk deploy CallyCertStack
 * 2. Check ACM console for DNS validation CNAME records
 * 3. Add the CNAME records to Vercel DNS (callygo.com)
 * 4. Wait for certificate to show "Issued" status
 * 5. Deploy CallyStack with certificate ARN from output
 */
export interface CallyCertStackProps extends cdk.StackProps {
  readonly domainName: string;
}

export class CallyCertStack extends cdk.Stack {
  public readonly certificateArn: string;

  constructor(scope: Construct, id: string, props: CallyCertStackProps) {
    super(scope, id, props);

    // Create certificate with DNS validation
    // The validation records must be added to Vercel DNS manually
    const certificate = new acm.Certificate(this, "CallyCognitoCert", {
      domainName: props.domainName,
      validation: acm.CertificateValidation.fromDns(),
      certificateName: `cally-cognito-${props.domainName}`,
    });

    this.certificateArn = certificate.certificateArn;

    // Output the certificate ARN for use in CallyStack
    new cdk.CfnOutput(this, "CertificateArn", {
      value: certificate.certificateArn,
      description: "Certificate ARN - use this when deploying CallyStack",
      exportName: "CallyCertificateArn",
    });

    // Output instructions
    new cdk.CfnOutput(this, "NextSteps", {
      value: `
1. Go to ACM Console in us-east-1
2. Find certificate for ${props.domainName}
3. Copy the DNS validation CNAME record
4. Add CNAME to Vercel DNS (callygo.com)
5. Wait for status to change to "Issued"
6. Deploy CallyStack: cdk deploy CallyStack -c callyCertificateArn=${certificate.certificateArn} -c emailsStreamArn=<ARN>
      `.trim(),
      description: "Next steps after deployment",
    });
  }
}
