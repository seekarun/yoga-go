import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import * as nodejsLambda from "aws-cdk-lib/aws-lambda-nodejs";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as ses from "aws-cdk-lib/aws-ses";
import type { Construct } from "constructs";
import * as path from "path";

// Domain configuration (DNS managed by Vercel)
const MYYOGA_GURU_DOMAIN = "myyoga.guru";
const COGNITO_CUSTOM_DOMAIN = `signin.${MYYOGA_GURU_DOMAIN}`;

export type YogaGoStackProps = cdk.StackProps;

/**
 * Yoga Go Application Stack (Vercel-optimized)
 *
 * Contains app-specific AWS resources:
 * - Cognito User Pool (authentication)
 * - DynamoDB Tables (data storage)
 * - SES Email Configuration (transactional emails)
 * - Lambda for welcome emails
 *
 * Note: Since we use Vercel for hosting, we no longer need:
 * - ECR Repository, ECS Service, Task Definition
 * - ALB Target Group, Listener Rule
 * - CloudWatch Log Group (for ECS)
 * - Route53 ALIAS records to ALB
 *
 * Vercel handles:
 * - Next.js hosting and deployment
 * - SSL certificates
 * - CDN and edge network
 * - Wildcard subdomains (*.myyoga.guru)
 */
export class YogaGoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: YogaGoStackProps) {
    super(scope, id, props);

    // ========================================
    // Cognito User Pool
    // ========================================
    const userPool = new cognito.UserPool(this, "YogaGoUserPool", {
      userPoolName: "yoga-go-users",
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
        fullname: { required: false, mutable: true },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      mfa: cognito.Mfa.OPTIONAL,
      mfaSecondFactor: { sms: false, otp: true },
      removalPolicy: cdk.RemovalPolicy.RETAIN,

      // Use SES for branded verification emails (instead of default Cognito email)
      // Note: SES is configured in us-west-2 (required for email receiving capability)
      email: cognito.UserPoolEmail.withSES({
        fromEmail: "noreply@myyoga.guru",
        fromName: "MyYoga.Guru",
        sesRegion: "us-west-2",
        sesVerifiedDomain: MYYOGA_GURU_DOMAIN,
      }),

      // Custom verification email template
      userVerification: {
        emailSubject: "Verify your MyYoga.Guru account",
        emailBody:
          "Namaste! Please verify your email by entering this code: {####}",
        emailStyle: cognito.VerificationEmailStyle.CODE,
      },
    });

    // ========================================
    // Cognito Domain Configuration
    // ========================================
    // Custom domain (signin.myyoga.guru) requires a certificate in us-east-1
    //
    // For new deployments:
    // 1. Create certificate in ACM us-east-1 for signin.myyoga.guru
    // 2. Add DNS validation CNAME records to Vercel
    // 3. Wait for certificate validation
    // 4. Deploy with: cdk deploy YogaGoStack -c cognitoCertificateArn=arn:aws:acm:us-east-1:...
    // 5. Add CNAME record in Vercel: signin.myyoga.guru -> [CloudFront domain from output]
    //
    // IMPORTANT: Always include the cognitoCertificateArn context parameter in deploys!

    const cognitoCertificateArn = this.node.tryGetContext(
      "cognitoCertificateArn",
    );

    if (!cognitoCertificateArn) {
      throw new Error(
        "cognitoCertificateArn context is required. Deploy with: cdk deploy -c cognitoCertificateArn=arn:aws:acm:us-east-1:...",
      );
    }

    const certificate = acm.Certificate.fromCertificateArn(
      this,
      "CognitoCertificate",
      cognitoCertificateArn,
    );

    const customDomain = userPool.addDomain("CognitoCustomDomain", {
      customDomain: {
        domainName: COGNITO_CUSTOM_DOMAIN,
        certificate,
      },
    });

    const cognitoDomainName = customDomain.domainName;

    // Output the CloudFront domain for DNS CNAME record
    new cdk.CfnOutput(this, "CognitoCloudFrontDomain", {
      value: customDomain.cloudFrontEndpoint,
      description: `Add CNAME record in Vercel: ${COGNITO_CUSTOM_DOMAIN} -> this value`,
      exportName: "YogaGoCognitoCloudFrontDomain",
    });

    // ========================================
    // Secrets Manager
    // ========================================
    const appSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      "AppSecret",
      "yoga-go/production",
    );

    // ========================================
    // Google & Facebook Identity Providers
    // ========================================
    const googleProvider = new cognito.UserPoolIdentityProviderGoogle(
      this,
      "GoogleProvider",
      {
        userPool,
        clientId: appSecret
          .secretValueFromJson("GOOGLE_CLIENT_ID")
          .unsafeUnwrap(),
        clientSecretValue: appSecret.secretValueFromJson(
          "GOOGLE_CLIENT_SECRET",
        ),
        scopes: ["email", "profile", "openid"],
        attributeMapping: {
          email: cognito.ProviderAttribute.GOOGLE_EMAIL,
          fullname: cognito.ProviderAttribute.GOOGLE_NAME,
          profilePicture: cognito.ProviderAttribute.GOOGLE_PICTURE,
        },
      },
    );

    const facebookProvider = new cognito.UserPoolIdentityProviderFacebook(
      this,
      "FacebookProvider",
      {
        userPool,
        clientId: appSecret
          .secretValueFromJson("FACEBOOK_APP_ID")
          .unsafeUnwrap(),
        clientSecret: appSecret
          .secretValueFromJson("FACEBOOK_APP_SECRET")
          .unsafeUnwrap(),
        scopes: ["email", "public_profile"],
        attributeMapping: {
          email: cognito.ProviderAttribute.FACEBOOK_EMAIL,
          fullname: cognito.ProviderAttribute.FACEBOOK_NAME,
        },
      },
    );

    // ========================================
    // Cognito App Client
    // ========================================
    const appClient = userPool.addClient("YogaGoWebClient", {
      userPoolClientName: "yoga-go-web",
      generateSecret: true,
      authFlows: { userPassword: true, userSrp: true },
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: [
          "http://localhost:3111/api/auth/callback/cognito",
          "https://myyoga.guru/api/auth/callback/cognito",
          "https://www.myyoga.guru/api/auth/callback/cognito",
          "http://localhost:3111/api/auth/google/callback",
          "https://myyoga.guru/api/auth/google/callback",
          "https://www.myyoga.guru/api/auth/google/callback",
          "http://localhost:3111/api/auth/facebook/callback",
          "https://myyoga.guru/api/auth/facebook/callback",
          "https://www.myyoga.guru/api/auth/facebook/callback",
        ],
        logoutUrls: [
          "http://localhost:3111",
          "https://myyoga.guru",
          "https://www.myyoga.guru",
        ],
      },
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.COGNITO,
        cognito.UserPoolClientIdentityProvider.GOOGLE,
        cognito.UserPoolClientIdentityProvider.FACEBOOK,
      ],
      preventUserExistenceErrors: true,
    });

    appClient.node.addDependency(googleProvider);
    appClient.node.addDependency(facebookProvider);

    // ========================================
    // AWS SES - Email Service
    // ========================================
    // Using ses.Identity.domain() since DNS is managed by Vercel, not Route53
    // DKIM and other DNS records are configured manually in Vercel DNS
    new ses.EmailIdentity(this, "EmailIdentity", {
      identity: ses.Identity.domain(MYYOGA_GURU_DOMAIN),
      mailFromDomain: `mail.${MYYOGA_GURU_DOMAIN}`,
    });

    const sesConfigSet = new ses.ConfigurationSet(this, "SesConfigSet", {
      configurationSetName: "yoga-go-emails",
      sendingEnabled: true,
      reputationMetrics: true,
    });

    sesConfigSet.addEventDestination("CloudWatchDestination", {
      destination: ses.EventDestination.cloudWatchDimensions([
        {
          name: "EmailType",
          source: ses.CloudWatchDimensionSource.MESSAGE_TAG,
          defaultValue: "transactional",
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
    new ses.CfnTemplate(this, "WelcomeEmailTemplate", {
      template: {
        templateName: "yoga-go-welcome",
        subjectPart: "Welcome to MyYoga.Guru! 🧘",
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

    new ses.CfnTemplate(this, "InvoiceEmailTemplate", {
      template: {
        templateName: "yoga-go-invoice",
        subjectPart: "Payment Confirmation - Order #{{orderId}} 🧘",
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
    // Welcome Email Lambda - DEPRECATED
    // ========================================
    // Welcome emails are now handled by the DynamoDB stream Lambda (user-welcome-stream)
    // which provides better logic for expert-branded vs generic emails.
    // The Cognito PostConfirmation trigger has been removed to prevent duplicate emails.

    // ========================================
    // DynamoDB Tables
    // ========================================
    // Note: Core table is created first so we can reference it for the stream Lambda
    const coreTable = new dynamodb.Table(this, "CoreTable", {
      tableName: "yoga-go-core",
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: false,
      // Enable DynamoDB Streams for welcome email trigger
      stream: dynamodb.StreamViewType.NEW_IMAGE,
    });

    coreTable.addGlobalSecondaryIndex({
      indexName: "GSI1",
      partitionKey: { name: "GSI1PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "GSI1SK", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ========================================
    // User Welcome Stream Lambda (DynamoDB Streams)
    // ========================================
    // Triggered when new USER records are created in yoga-go-core
    // Sends appropriate welcome email based on user type (expert/learner)
    const userWelcomeStreamLambda = new nodejsLambda.NodejsFunction(
      this,
      "UserWelcomeStreamLambda",
      {
        functionName: "yoga-go-user-welcome-stream",
        runtime: lambda.Runtime.NODEJS_22_X,
        handler: "handler",
        entry: path.join(__dirname, "../lambda/user-welcome-stream.ts"),
        timeout: cdk.Duration.seconds(30),
        memorySize: 256,
        environment: {
          DYNAMODB_TABLE: coreTable.tableName,
          ANALYTICS_TABLE: "yoga-go-analytics",
          SES_FROM_EMAIL: "hi@myyoga.guru",
          // Use us-west-2 config set since Lambda sends email via SES in us-west-2
          SES_CONFIG_SET: "yoga-go-emails-west",
        },
        bundling: { minify: true, sourceMap: false },
      },
    );

    // Grant DynamoDB read access for looking up expert data
    coreTable.grantReadData(userWelcomeStreamLambda);

    // Grant SES email sending permissions
    userWelcomeStreamLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "ses:SendEmail",
          "ses:SendRawEmail",
          "ses:SendTemplatedEmail",
        ],
        resources: ["*"],
        conditions: {
          StringLike: { "ses:FromAddress": "*@myyoga.guru" },
        },
      }),
    );

    // Add DynamoDB Stream as event source
    // Filter to process USER and TENANT INSERT events
    // - USER: send learner welcome (skip if expert role)
    // - TENANT: send expert welcome with subdomain info
    userWelcomeStreamLambda.addEventSource(
      new lambdaEventSources.DynamoEventSource(coreTable, {
        startingPosition: lambda.StartingPosition.LATEST,
        batchSize: 10,
        retryAttempts: 2,
        // Multiple filters are OR'd together
        filters: [
          // USER records
          lambda.FilterCriteria.filter({
            eventName: lambda.FilterRule.isEqual("INSERT"),
            dynamodb: {
              Keys: {
                PK: { S: lambda.FilterRule.isEqual("USER") },
              },
            },
          }),
          // TENANT records
          lambda.FilterCriteria.filter({
            eventName: lambda.FilterRule.isEqual("INSERT"),
            dynamodb: {
              Keys: {
                PK: { S: lambda.FilterRule.isEqual("TENANT") },
              },
            },
          }),
        ],
      }),
    );

    new dynamodb.Table(this, "OrdersTable", {
      tableName: "yoga-go-orders",
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: false,
    });

    const analyticsTable = new dynamodb.Table(this, "AnalyticsTable", {
      tableName: "yoga-go-analytics",
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: false,
    });

    // Grant the user welcome stream Lambda write access to analytics table
    analyticsTable.grantWriteData(userWelcomeStreamLambda);

    const discussionsTable = new dynamodb.Table(this, "DiscussionsTable", {
      tableName: "yoga-go-discussions",
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: false,
    });

    discussionsTable.addGlobalSecondaryIndex({
      indexName: "GSI1",
      partitionKey: { name: "GSI1PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "GSI1SK", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const blogTable = new dynamodb.Table(this, "BlogTable", {
      tableName: "yoga-go-blog",
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: false,
    });

    // Assets table - for Cloudflare uploaded images/videos
    const assetsTable = new dynamodb.Table(this, "AssetsTable", {
      tableName: "yoga-go-assets",
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: false,
    });

    // GSI1: Query by Cloudflare Image ID
    assetsTable.addGlobalSecondaryIndex({
      indexName: "GSI1",
      partitionKey: { name: "GSI1PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "GSI1SK", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI2: Query by related entity (expert, course, lesson)
    assetsTable.addGlobalSecondaryIndex({
      indexName: "GSI2",
      partitionKey: { name: "GSI2PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "GSI2SK", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI3: Query by uploader (user)
    assetsTable.addGlobalSecondaryIndex({
      indexName: "GSI3",
      partitionKey: { name: "GSI3PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "GSI3SK", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Boost table - for wallet and boost campaigns
    const boostTable = new dynamodb.Table(this, "BoostTable", {
      tableName: "yoga-go-boost",
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: false,
    });

    // GSI1: Query active boosts by status (for cron sync jobs)
    boostTable.addGlobalSecondaryIndex({
      indexName: "GSI1",
      partitionKey: { name: "GSI1PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "GSI1SK", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Emails table - for expert/admin inboxes
    // Separate table for high-volume email storage
    const emailsTable = new dynamodb.Table(this, "EmailsTable", {
      tableName: "yoga-go-emails",
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: false,
    });

    // GSI1: Query unread emails efficiently
    emailsTable.addGlobalSecondaryIndex({
      indexName: "GSI1",
      partitionKey: { name: "GSI1PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "GSI1SK", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ========================================
    // IAM User for Vercel Deployment
    // ========================================
    // Since we're hosting on Vercel (not ECS), we need an IAM user
    // with access keys for the app to access AWS services
    const vercelUser = new iam.User(this, "VercelUser", {
      userName: "yoga-go-vercel",
    });

    // DynamoDB access policy
    const dynamoDbPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:BatchGetItem",
        "dynamodb:BatchWriteItem",
      ],
      resources: [
        coreTable.tableArn,
        `${coreTable.tableArn}/index/*`,
        `arn:aws:dynamodb:${this.region}:${this.account}:table/yoga-go-orders`,
        `arn:aws:dynamodb:${this.region}:${this.account}:table/yoga-go-orders/index/*`,
        `arn:aws:dynamodb:${this.region}:${this.account}:table/yoga-go-analytics`,
        `arn:aws:dynamodb:${this.region}:${this.account}:table/yoga-go-analytics/index/*`,
        discussionsTable.tableArn,
        `${discussionsTable.tableArn}/index/*`,
        blogTable.tableArn,
        `${blogTable.tableArn}/index/*`,
        assetsTable.tableArn,
        `${assetsTable.tableArn}/index/*`,
        boostTable.tableArn,
        `${boostTable.tableArn}/index/*`,
        emailsTable.tableArn,
        `${emailsTable.tableArn}/index/*`,
      ],
    });

    // SES email sending policy
    const sesEmailPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["ses:SendEmail", "ses:SendRawEmail", "ses:SendTemplatedEmail"],
      resources: ["*"],
      conditions: {
        StringLike: {
          "ses:FromAddress": "*@myyoga.guru",
        },
      },
    });

    // SES email verification policy (for expert custom emails)
    const sesVerificationPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "ses:CreateEmailIdentity",
        "ses:DeleteEmailIdentity",
        "ses:GetEmailIdentity",
      ],
      resources: ["*"],
    });

    // Cognito read-only policy
    const cognitoPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "cognito-idp:DescribeUserPool",
        "cognito-idp:DescribeUserPoolClient",
        "cognito-idp:GetUser",
      ],
      resources: [userPool.userPoolArn],
    });

    // Create managed policy and attach to user
    const vercelPolicy = new iam.ManagedPolicy(this, "VercelPolicy", {
      managedPolicyName: "yoga-go-vercel-policy",
      statements: [
        dynamoDbPolicy,
        sesEmailPolicy,
        sesVerificationPolicy,
        cognitoPolicy,
      ],
    });

    vercelUser.addManagedPolicy(vercelPolicy);

    // ========================================
    // Outputs
    // ========================================
    new cdk.CfnOutput(this, "VercelUserArn", {
      value: vercelUser.userArn,
      description:
        "IAM User ARN for Vercel - create access keys in AWS Console",
      exportName: "YogaGoVercelUserArn",
    });

    new cdk.CfnOutput(this, "UserPoolId", {
      value: userPool.userPoolId,
      description: "Cognito User Pool ID",
      exportName: "YogaGoUserPoolId",
    });

    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: appClient.userPoolClientId,
      description: "Cognito App Client ID",
      exportName: "YogaGoUserPoolClientId",
    });

    new cdk.CfnOutput(this, "CognitoDomain", {
      value: cognitoDomainName,
      description: "Cognito Hosted UI Domain",
      exportName: "YogaGoCognitoDomain",
    });

    new cdk.CfnOutput(this, "DynamoDBCoreTableName", {
      value: coreTable.tableName,
      description: "DynamoDB Core Table Name",
      exportName: "YogaGoDynamoDBCoreTableName",
    });

    new cdk.CfnOutput(this, "SESConfigSetName", {
      value: sesConfigSet.configurationSetName,
      description: "SES Configuration Set Name",
      exportName: "YogaGoSESConfigSetName",
    });
  }
}
