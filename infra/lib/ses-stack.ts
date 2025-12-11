import * as cdk from 'aws-cdk-lib';
import * as ses from 'aws-cdk-lib/aws-ses';
import * as sesActions from 'aws-cdk-lib/aws-ses-actions';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejsLambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import type { Construct } from 'constructs';

// Domain configuration (DNS managed by Vercel)
const MYYOGA_GURU_DOMAIN = 'myyoga.guru';

export interface SesStackProps extends cdk.StackProps {
  /** DynamoDB Core Table ARN (for Lambda to read expert data) */
  coreTableArn: string;
  /** DynamoDB Core Table Name */
  coreTableName: string;
}

/**
 * SES Email Stack (us-west-2)
 *
 * Contains SES resources that need to be in us-west-2 for email receiving:
 * - SES Email Identity (domain verification)
 * - SES Configuration Set
 * - Email Templates
 * - S3 Bucket for incoming emails
 * - Lambda for email forwarding
 * - SES Receipt Rules
 *
 * Note: SES email receiving is only available in us-east-1, us-west-2, and eu-west-1.
 * We use us-west-2 for both sending and receiving.
 */
export class SesStack extends cdk.Stack {
  public readonly configSetName: string;

  constructor(scope: Construct, id: string, props: SesStackProps) {
    super(scope, id, props);

    const { coreTableArn, coreTableName } = props;

    // ========================================
    // SES Email Identity (Domain Verification)
    // ========================================
    // Using ses.Identity.domain() since DNS is managed by Vercel, not Route53
    // DKIM and other DNS records are configured manually in Vercel DNS
    const emailIdentity = new ses.EmailIdentity(this, 'EmailIdentity', {
      identity: ses.Identity.domain(MYYOGA_GURU_DOMAIN),
    });

    // Suppress the unused variable warning - emailIdentity is used for implicit dependency
    void emailIdentity;

    // ========================================
    // SES Configuration Set
    // ========================================
    const sesConfigSet = new ses.ConfigurationSet(this, 'SesConfigSet', {
      configurationSetName: 'yoga-go-emails-west',
      sendingEnabled: true,
      reputationMetrics: true,
    });

    this.configSetName = sesConfigSet.configurationSetName;

    sesConfigSet.addEventDestination('CloudWatchDestination', {
      destination: ses.EventDestination.cloudWatchDimensions([
        {
          name: 'EmailType',
          source: ses.CloudWatchDimensionSource.MESSAGE_TAG,
          defaultValue: 'transactional',
        },
      ]),
      events: [
        ses.EmailSendingEvent.SEND,
        ses.EmailSendingEvent.DELIVERY,
        ses.EmailSendingEvent.BOUNCE,
        ses.EmailSendingEvent.COMPLAINT,
        ses.EmailSendingEvent.REJECT,
        ses.EmailSendingEvent.OPEN,
        ses.EmailSendingEvent.CLICK,
      ],
    });

    // ========================================
    // SES Email Templates
    // ========================================
    new ses.CfnTemplate(this, 'WelcomeEmailTemplate', {
      template: {
        templateName: 'yoga-go-welcome',
        subjectPart: 'Welcome to MyYoga.Guru! 🧘',
        textPart: `Hi {{name}},

Welcome to MyYoga.Guru!

We're thrilled to have you join our community of yoga enthusiasts.

Namaste,
The MyYoga.Guru Team`,
        htmlPart: `<!DOCTYPE html>
<html><body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
<h1 style="color: #6366f1;">🧘 MyYoga.Guru</h1>
<h2>Hi {{name}}!</h2>
<p>Welcome to <strong>MyYoga.Guru</strong>!</p>
<p>We're thrilled to have you join our community of yoga enthusiasts.</p>
<div style="text-align: center; margin: 30px 0;">
<a href="https://www.myyoga.guru/app" style="background-color: #6366f1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">Start Exploring</a>
</div>
<p><strong>Namaste,</strong><br>The MyYoga.Guru Team</p>
</body></html>`,
      },
    });

    new ses.CfnTemplate(this, 'InvoiceEmailTemplate', {
      template: {
        templateName: 'yoga-go-invoice',
        subjectPart: 'Payment Confirmation - Order #{{orderId}} 🧘',
        textPart: `Hi {{customerName}},

Thank you for your purchase!

Order ID: {{orderId}}
Amount: {{currency}} {{amount}}
Status: PAID

Namaste,
The MyYoga.Guru Team`,
        htmlPart: `<!DOCTYPE html>
<html><body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
<h1 style="color: #6366f1;">🧘 MyYoga.Guru - Payment Confirmation</h1>
<p>Hi <strong>{{customerName}}</strong>,</p>
<p>Thank you for your purchase!</p>
<div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
<p><strong>Order ID:</strong> {{orderId}}</p>
<p><strong>Amount:</strong> {{currency}} {{amount}}</p>
<p><strong>Status:</strong> <span style="color: #16a34a;">PAID</span></p>
</div>
<p><strong>Namaste,</strong><br>The MyYoga.Guru Team</p>
</body></html>`,
      },
    });

    // ========================================
    // S3 Bucket for Incoming Emails
    // ========================================
    const emailBucket = new s3.Bucket(this, 'EmailBucket', {
      bucketName: `yoga-go-incoming-emails-${this.account}`,
      lifecycleRules: [
        {
          id: 'DeleteAfterOneDay',
          expiration: cdk.Duration.days(1),
          enabled: true,
        },
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    // Allow SES to write to the bucket
    emailBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal('ses.amazonaws.com')],
        actions: ['s3:PutObject'],
        resources: [`${emailBucket.bucketArn}/*`],
        conditions: {
          StringEquals: {
            'AWS:SourceAccount': this.account,
          },
        },
      })
    );

    // ========================================
    // Email Forwarder Lambda
    // ========================================
    const emailForwarderLambda = new nodejsLambda.NodejsFunction(this, 'EmailForwarderLambda', {
      functionName: 'yoga-go-email-forwarder',
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'handler',
      entry: path.join(__dirname, '../lambda/email-forwarder.ts'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        DYNAMODB_TABLE: coreTableName,
        EMAIL_BUCKET: emailBucket.bucketName,
        DEFAULT_FROM_EMAIL: 'hi@myyoga.guru',
      },
      bundling: { minify: true, sourceMap: false },
    });

    // Grant Lambda permissions
    emailBucket.grantRead(emailForwarderLambda);

    // DynamoDB read access (cross-region)
    emailForwarderLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['dynamodb:GetItem', 'dynamodb:Query'],
        resources: [coreTableArn, `${coreTableArn}/index/*`],
      })
    );

    // SES send email permission
    emailForwarderLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['ses:SendRawEmail'],
        resources: ['*'],
      })
    );

    // Allow SES to invoke the Lambda
    emailForwarderLambda.addPermission('AllowSES', {
      principal: new iam.ServicePrincipal('ses.amazonaws.com'),
      sourceAccount: this.account,
    });

    // ========================================
    // SES Receipt Rule Set
    // ========================================
    const receiptRuleSet = new ses.ReceiptRuleSet(this, 'EmailReceiptRuleSet', {
      receiptRuleSetName: 'yoga-go-inbound',
    });

    // Rule 1: Platform emails (@myyoga.guru)
    // This matches all @myyoga.guru emails
    receiptRuleSet.addRule('ForwardPlatformEmails', {
      recipients: ['myyoga.guru'],
      actions: [
        new sesActions.S3({
          bucket: emailBucket,
          objectKeyPrefix: 'incoming/',
        }),
        new sesActions.Lambda({
          function: emailForwarderLambda,
          invocationType: sesActions.LambdaInvocationType.EVENT,
        }),
      ],
      scanEnabled: true,
    });

    // Rule 2: BYOD custom domain emails (catch-all for any verified domain)
    // Empty recipients array = catch all emails for any verified domain in SES
    // Lambda filters by domain to find the right tenant
    // Note: This rule is processed after the platform rule, so myyoga.guru
    // emails are handled by the first rule and don't fall through here
    receiptRuleSet.addRule('ForwardByodEmails', {
      recipients: [], // Catch-all for any SES-verified domain
      actions: [
        new sesActions.S3({
          bucket: emailBucket,
          objectKeyPrefix: 'incoming/',
        }),
        new sesActions.Lambda({
          function: emailForwarderLambda,
          invocationType: sesActions.LambdaInvocationType.EVENT,
        }),
      ],
      scanEnabled: true,
    });

    // ========================================
    // MX Record for Email Receiving
    // ========================================
    // Note: MX record must be configured in Vercel DNS (not Route53)
    // Add this record in Vercel DNS dashboard:
    // Type: MX, Name: @, Value: 10 inbound-smtp.us-west-2.amazonaws.com

    // ========================================
    // Outputs
    // ========================================
    new cdk.CfnOutput(this, 'SESConfigSetName', {
      value: sesConfigSet.configurationSetName,
      description: 'SES Configuration Set Name (us-west-2)',
      exportName: 'YogaGoSESConfigSetNameWest',
    });

    new cdk.CfnOutput(this, 'EmailBucketName', {
      value: emailBucket.bucketName,
      description: 'S3 Bucket for incoming emails',
      exportName: 'YogaGoEmailBucketName',
    });

    new cdk.CfnOutput(this, 'EmailForwarderLambdaArn', {
      value: emailForwarderLambda.functionArn,
      description: 'Email Forwarder Lambda ARN',
      exportName: 'YogaGoEmailForwarderLambdaArn',
    });

    new cdk.CfnOutput(this, 'ReceiptRuleSetName', {
      value: receiptRuleSet.receiptRuleSetName,
      description: 'SES Receipt Rule Set Name',
      exportName: 'YogaGoReceiptRuleSetName',
    });
  }
}
