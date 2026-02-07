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
import * as sns from "aws-cdk-lib/aws-sns";
import * as snsSubscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import * as sqs from "aws-cdk-lib/aws-sqs";
import type { Construct } from "constructs";
import * as path from "path";

// Default domain - can be overridden via CDK context: -c domain=reelzai.com
const DEFAULT_DOMAIN = "myyoga.guru";

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
    // Domain Configuration
    // ========================================
    // Get domain from context, default to myyoga.guru
    // Deploy with: npx cdk deploy -c domain=reelzai.com (for dev)
    const appDomain: string =
      this.node.tryGetContext("domain") || DEFAULT_DOMAIN;
    const cognitoDomain = `signin.${appDomain}`;
    const appName = appDomain === "myyoga.guru" ? "MyYoga.Guru" : "ReelzAI";

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
        fromEmail: `noreply@${appDomain}`,
        fromName: appName,
        sesRegion: "us-west-2",
        sesVerifiedDomain: appDomain,
      }),

      // Custom verification email template
      userVerification: {
        emailSubject: `Verify your ${appName} account`,
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
    // IMPORTANT: Always include the cognitoCertificateArn context parameter when deploying this stack!
    // For other stacks (CognitoCertStack, etc.), a placeholder is used to allow synthesis.

    const cognitoCertificateArn = this.node.tryGetContext(
      "cognitoCertificateArn",
    );

    // Fail early if certificate ARN is not provided
    if (!cognitoCertificateArn) {
      throw new Error(
        `Missing required context parameter: cognitoCertificateArn

Deploy with: npx cdk deploy YogaGoStack -c cognitoCertificateArn=arn:aws:acm:us-east-1:ACCOUNT:certificate/CERT-ID

To get the certificate ARN:
1. Deploy CognitoCertStack first: npx cdk deploy CognitoCertStack
2. Validate the certificate in ACM (add DNS CNAME to Vercel)
3. Copy the certificate ARN from ACM console or stack output`,
      );
    }

    const certificateArn = cognitoCertificateArn;

    const certificate = acm.Certificate.fromCertificateArn(
      this,
      "CognitoCertificate",
      certificateArn,
    );

    const customDomain = userPool.addDomain("CognitoCustomDomain", {
      customDomain: {
        domainName: cognitoDomain,
        certificate,
      },
    });

    const cognitoDomainName = customDomain.domainName;

    // Output the CloudFront domain for DNS CNAME record
    new cdk.CfnOutput(this, "CognitoCloudFrontDomain", {
      value: customDomain.cloudFrontEndpoint,
      description: `Add CNAME record in Vercel: ${cognitoDomain} -> this value`,
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
          `https://${appDomain}/api/auth/callback/cognito`,
          `https://www.${appDomain}/api/auth/callback/cognito`,
          "http://localhost:3111/api/auth/google/callback",
          `https://${appDomain}/api/auth/google/callback`,
          `https://www.${appDomain}/api/auth/google/callback`,
          "http://localhost:3111/api/auth/facebook/callback",
          `https://${appDomain}/api/auth/facebook/callback`,
          `https://www.${appDomain}/api/auth/facebook/callback`,
        ],
        logoutUrls: [
          "http://localhost:3111",
          `https://${appDomain}`,
          `https://www.${appDomain}`,
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
      identity: ses.Identity.domain(appDomain),
      mailFromDomain: `mail.${appDomain}`,
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

    // Users table - dedicated table for user accounts (separate from core)
    const usersTable = new dynamodb.Table(this, "UsersTable", {
      tableName: "yoga-go-users",
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: false,
      // Enable DynamoDB Streams for welcome email trigger
      stream: dynamodb.StreamViewType.NEW_IMAGE,
    });

    // ========================================
    // User Welcome Stream Lambda (DynamoDB Streams)
    // ========================================
    // Triggered when new USER records are created in yoga-go-users
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
          USERS_TABLE: usersTable.tableName,
          ANALYTICS_TABLE: "yoga-go-analytics",
          SES_FROM_EMAIL: `hi@${appDomain}`,
          APP_DOMAIN: appDomain,
          // Use us-west-2 config set since Lambda sends email via SES in us-west-2
          SES_CONFIG_SET: "yoga-go-emails-west",
        },
        bundling: { minify: true, sourceMap: false },
      },
    );

    // Grant DynamoDB read access for looking up expert/user data
    coreTable.grantReadData(userWelcomeStreamLambda);
    usersTable.grantReadData(userWelcomeStreamLambda);

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
          StringLike: { "ses:FromAddress": `*@${appDomain}` },
        },
      }),
    );

    // Add DynamoDB Stream event sources
    // - Users table: USER records for learner welcome emails
    // - Core table: TENANT records for expert welcome emails

    // Users table stream - USER records (PK={cognitoSub}, SK=PROFILE)
    userWelcomeStreamLambda.addEventSource(
      new lambdaEventSources.DynamoEventSource(usersTable, {
        startingPosition: lambda.StartingPosition.LATEST,
        batchSize: 10,
        retryAttempts: 2,
        filters: [
          lambda.FilterCriteria.filter({
            eventName: lambda.FilterRule.isEqual("INSERT"),
            dynamodb: {
              Keys: {
                SK: { S: lambda.FilterRule.isEqual("PROFILE") },
              },
            },
          }),
        ],
      }),
    );

    // Core table stream - TENANT records for expert welcome emails
    userWelcomeStreamLambda.addEventSource(
      new lambdaEventSources.DynamoEventSource(coreTable, {
        startingPosition: lambda.StartingPosition.LATEST,
        batchSize: 10,
        retryAttempts: 2,
        filters: [
          lambda.FilterCriteria.filter({
            eventName: lambda.FilterRule.isEqual("INSERT"),
            dynamodb: {
              NewImage: {
                entityType: { S: lambda.FilterRule.isEqual("TENANT") },
              },
            },
          }),
        ],
      }),
    );

    // ========================================
    // Survey Response Validator Lambda (DynamoDB Streams)
    // ========================================
    // Triggered when new SURVEYRESP records are created in yoga-go-core
    // Validates email addresses for survey responses:
    // - Checks for duplicate submissions (> 3 from same email)
    // - Checks for disposable/temporary email domains
    // - Verifies MX DNS records exist for the domain
    // - Sends verification email to check for bounces
    const surveyResponseValidatorLambda = new nodejsLambda.NodejsFunction(
      this,
      "SurveyResponseValidatorLambda",
      {
        functionName: "yoga-go-survey-response-validator",
        runtime: lambda.Runtime.NODEJS_22_X,
        handler: "handler",
        entry: path.join(__dirname, "../lambda/survey-response-validator.ts"),
        timeout: cdk.Duration.seconds(30),
        memorySize: 256,
        environment: {
          DYNAMODB_TABLE: coreTable.tableName,
          EMAILS_TABLE: "yoga-go-emails",
          SES_FROM_EMAIL: `verify@${appDomain}`,
          // Use us-west-2 config set since Lambda sends email via SES in us-west-2
          SES_CONFIG_SET: "yoga-go-emails-west",
          // DeBounce API for email validation (key from Secrets Manager)
          DEBOUNCE_API_KEY: appSecret
            .secretValueFromJson("DEBOUNCE_API_KEY")
            .unsafeUnwrap(),
        },
        bundling: {
          minify: true,
          sourceMap: false,
          // Bundle @core/lib from monorepo
          nodeModules: [],
          esbuildArgs: {
            "--alias:@core/lib": path.join(__dirname, "../../core/lib/src"),
          },
        },
      },
    );

    // Grant DynamoDB read/write for querying responses and updating validation status
    coreTable.grantReadWriteData(surveyResponseValidatorLambda);

    // Grant SES email sending permissions for verification emails
    surveyResponseValidatorLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["ses:SendEmail", "ses:SendRawEmail"],
        resources: ["*"],
        conditions: {
          StringLike: { "ses:FromAddress": `*@${appDomain}` },
        },
      }),
    );

    // Add DynamoDB Stream event source for SURVEYRESP records
    surveyResponseValidatorLambda.addEventSource(
      new lambdaEventSources.DynamoEventSource(coreTable, {
        startingPosition: lambda.StartingPosition.LATEST,
        batchSize: 10,
        retryAttempts: 2,
        filters: [
          lambda.FilterCriteria.filter({
            eventName: lambda.FilterRule.isEqual("INSERT"),
            dynamodb: {
              Keys: {
                SK: {
                  S: lambda.FilterRule.beginsWith("SURVEYRESP#"),
                },
              },
            },
          }),
        ],
      }),
    );

    // ========================================
    // SES Bounce Handler Lambda (SNS Triggered)
    // ========================================
    // Handles bounce/complaint notifications from SES via SNS
    // Updates survey response validation status to 'invalid'

    // SNS Topic for SES bounce notifications
    const sesBounceNotificationTopic = new sns.Topic(
      this,
      "SesBounceNotificationTopic",
      {
        topicName: "yoga-go-ses-bounce-notifications",
        displayName: "SES Bounce Notifications",
      },
    );

    // Bounce handler Lambda
    const sesBounceHandlerLambda = new nodejsLambda.NodejsFunction(
      this,
      "SesBounceHandlerLambda",
      {
        functionName: "yoga-go-ses-bounce-handler",
        runtime: lambda.Runtime.NODEJS_22_X,
        handler: "handler",
        entry: path.join(__dirname, "../lambda/ses-bounce-handler.ts"),
        timeout: cdk.Duration.seconds(30),
        memorySize: 256,
        environment: {
          DYNAMODB_TABLE: coreTable.tableName,
          EMAILS_TABLE: "yoga-go-emails",
        },
        bundling: { minify: true, sourceMap: false },
      },
    );

    // Grant DynamoDB read/write for updating validation status
    coreTable.grantReadWriteData(sesBounceHandlerLambda);

    // Subscribe Lambda to SNS topic
    sesBounceNotificationTopic.addSubscription(
      new snsSubscriptions.LambdaSubscription(sesBounceHandlerLambda),
    );

    // Add SNS event destination for bounces and complaints
    sesConfigSet.addEventDestination("BounceNotificationDestination", {
      destination: ses.EventDestination.snsTopic(sesBounceNotificationTopic),
      events: [ses.EmailSendingEvent.BOUNCE, ses.EmailSendingEvent.COMPLAINT],
    });

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
      timeToLiveAttribute: "ttl", // Auto-delete read notifications after 14 days
      stream: dynamodb.StreamViewType.NEW_IMAGE, // Enable stream for forum notifications
    });

    discussionsTable.addGlobalSecondaryIndex({
      indexName: "GSI1",
      partitionKey: { name: "GSI1PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "GSI1SK", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI2 for public thread aggregation by expert
    discussionsTable.addGlobalSecondaryIndex({
      indexName: "GSI2",
      partitionKey: { name: "GSI2PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "GSI2SK", type: dynamodb.AttributeType.STRING },
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
      timeToLiveAttribute: "ttl", // Auto-delete soft-deleted emails after 90 days
      // Enable DynamoDB Streams for notification triggers
      stream: dynamodb.StreamViewType.NEW_IMAGE,
    });

    // GSI1: Query unread emails efficiently
    emailsTable.addGlobalSecondaryIndex({
      indexName: "GSI1",
      partitionKey: { name: "GSI1PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "GSI1SK", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Grant email validation lambdas access to emails table for blocklist
    emailsTable.grantReadData(surveyResponseValidatorLambda);
    emailsTable.grantReadWriteData(sesBounceHandlerLambda);

    // ========================================
    // Notification Stream Lambda (DynamoDB Streams)
    // ========================================
    // Triggered when new emails are received (INSERT events on emails table)
    // Creates notifications in the discussions table and pushes to Firebase RTDB
    const notificationStreamLambda = new nodejsLambda.NodejsFunction(
      this,
      "NotificationStreamLambda",
      {
        functionName: "yoga-go-notification-stream",
        runtime: lambda.Runtime.NODEJS_22_X,
        handler: "handler",
        entry: path.join(__dirname, "../lambda/notification-stream.ts"),
        timeout: cdk.Duration.seconds(30),
        memorySize: 256,
        environment: {
          DYNAMODB_TABLE: discussionsTable.tableName,
          EMAILS_TABLE: emailsTable.tableName,
          APP_DOMAIN: appDomain,
        },
        bundling: { minify: true, sourceMap: false },
      },
    );

    // Grant DynamoDB read/write for creating notifications in discussions table
    discussionsTable.grantReadWriteData(notificationStreamLambda);
    emailsTable.grantReadData(notificationStreamLambda);

    // Grant access to secrets for Firebase credentials
    appSecret.grantRead(notificationStreamLambda);

    // Add DynamoDB Stream event source for incoming emails
    // Filter: Only INSERT events for incoming emails (not outgoing)
    // Multiple filters act as OR - match when isOutgoing is false OR doesn't exist
    notificationStreamLambda.addEventSource(
      new lambdaEventSources.DynamoEventSource(emailsTable, {
        startingPosition: lambda.StartingPosition.LATEST,
        batchSize: 10,
        retryAttempts: 2,
        filters: [
          // Filter 1: isOutgoing is explicitly false
          lambda.FilterCriteria.filter({
            eventName: lambda.FilterRule.isEqual("INSERT"),
            dynamodb: {
              NewImage: {
                isOutgoing: {
                  BOOL: lambda.FilterRule.isEqual(false),
                },
              },
            },
          }),
          // Filter 2: isOutgoing field doesn't exist at all
          lambda.FilterCriteria.filter({
            eventName: lambda.FilterRule.isEqual("INSERT"),
            dynamodb: {
              NewImage: {
                isOutgoing: lambda.FilterRule.notExists(),
              },
            },
          }),
        ],
      }),
    );

    // Add DynamoDB Stream event source for forum threads/replies
    // Filter: Only INSERT events for FORUM_THREAD or FORUM_REPLY entity types
    notificationStreamLambda.addEventSource(
      new lambdaEventSources.DynamoEventSource(discussionsTable, {
        startingPosition: lambda.StartingPosition.LATEST,
        batchSize: 10,
        retryAttempts: 2,
        filters: [
          // Filter for FORUM_THREAD inserts
          lambda.FilterCriteria.filter({
            eventName: lambda.FilterRule.isEqual("INSERT"),
            dynamodb: {
              NewImage: {
                entityType: {
                  S: lambda.FilterRule.isEqual("FORUM_THREAD"),
                },
              },
            },
          }),
          // Filter for FORUM_REPLY inserts
          lambda.FilterCriteria.filter({
            eventName: lambda.FilterRule.isEqual("INSERT"),
            dynamodb: {
              NewImage: {
                entityType: {
                  S: lambda.FilterRule.isEqual("FORUM_REPLY"),
                },
              },
            },
          }),
        ],
      }),
    );

    // ========================================
    // Recording Processor Queue (SQS)
    // ========================================
    // Processes Zoom/Meet recording imports to Cloudflare Stream
    const recordingDlq = new sqs.Queue(this, "RecordingProcessorDLQ", {
      queueName: "yoga-go-recording-processor-dlq",
      retentionPeriod: cdk.Duration.days(14),
    });

    const recordingQueue = new sqs.Queue(this, "RecordingProcessorQueue", {
      queueName: "yoga-go-recording-processor",
      visibilityTimeout: cdk.Duration.minutes(15), // Long timeout for video processing
      receiveMessageWaitTime: cdk.Duration.seconds(20), // Long polling
      deadLetterQueue: {
        queue: recordingDlq,
        maxReceiveCount: 3,
      },
    });

    // ========================================
    // Recording Processor Lambda
    // ========================================
    // Downloads recordings from Zoom and uploads to Cloudflare Stream
    const recordingProcessorLambda = new nodejsLambda.NodejsFunction(
      this,
      "RecordingProcessorLambda",
      {
        functionName: "yoga-go-recording-processor",
        runtime: lambda.Runtime.NODEJS_22_X,
        handler: "handler",
        entry: path.join(__dirname, "../lambda/recording-processor.ts"),
        timeout: cdk.Duration.minutes(15), // Max Lambda timeout
        memorySize: 1024, // Higher memory for video download/upload
        environment: {
          DYNAMODB_TABLE: coreTable.tableName,
          AWS_DYNAMODB_REGION: "ap-southeast-2",
        },
        bundling: { minify: true, sourceMap: false },
      },
    );

    // Grant DynamoDB read/write for updating recording status
    coreTable.grantReadWriteData(recordingProcessorLambda);

    // Grant access to read Cloudflare secrets
    appSecret.grantRead(recordingProcessorLambda);

    // Add SQS as event source
    recordingProcessorLambda.addEventSource(
      new lambdaEventSources.SqsEventSource(recordingQueue, {
        batchSize: 1, // Process one recording at a time
        maxConcurrency: 5, // Limit concurrent processing
      }),
    );

    // Output queue URL for webhook handler
    new cdk.CfnOutput(this, "RecordingQueueUrl", {
      value: recordingQueue.queueUrl,
      description: "SQS Queue URL for recording processor",
      exportName: "YogaGoRecordingQueueUrl",
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
        usersTable.tableArn,
        `${usersTable.tableArn}/index/*`,
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
          "ses:FromAddress": `*@${appDomain}`,
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

    // Cognito policy - includes AdminGetUser for user verification
    const cognitoPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "cognito-idp:DescribeUserPool",
        "cognito-idp:DescribeUserPoolClient",
        "cognito-idp:GetUser",
        "cognito-idp:AdminGetUser",
      ],
      resources: [userPool.userPoolArn],
    });

    // SQS send message policy (for webhook handlers to queue recordings)
    const sqsSendPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["sqs:SendMessage"],
      resources: [recordingQueue.queueArn],
    });

    // Create managed policy and attach to user
    const vercelPolicy = new iam.ManagedPolicy(this, "VercelPolicy", {
      managedPolicyName: "yoga-go-vercel-policy",
      statements: [
        dynamoDbPolicy,
        sesEmailPolicy,
        sesVerificationPolicy,
        cognitoPolicy,
        sqsSendPolicy,
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
