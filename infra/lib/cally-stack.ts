import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import type { Construct } from "constructs";
import * as path from "path";

/**
 * Cally Application Stack
 *
 * Infrastructure for the Cally app (landing pages, calendar, live sessions).
 * Contains:
 * - Cognito User Pool with Google OAuth
 * - DynamoDB Table (cally-main) with single-table design
 * - IAM User for Vercel deployment
 *
 * Key Patterns (cally-main table):
 * - User: PK=USER#{cognitoSub}, SK=PROFILE
 * - Expert: PK=EXPERT#{expertId}, SK=PROFILE
 * - Session: PK=SESSION#{expertId}, SK={sessionId}
 * - Booking: PK=BOOKING#{userId}, SK={sessionId}
 *
 * GSIs:
 * - GSI1: Inverted lookups (email→user, slug→expert)
 * - GSI2: Time-based queries (sessions by date)
 */
export class CallyStack extends cdk.Stack {
  public readonly coreTable: dynamodb.Table;
  public readonly audioBucket: s3.Bucket;
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ========================================
    // Secrets Manager - Google OAuth Credentials
    // ========================================
    // Expects secret with structure:
    // {
    //   "GOOGLE_CLIENT_ID": "<client-id>",
    //   "GOOGLE_CLIENT_SECRET": "<client-secret>"
    // }
    const appSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      "AppSecret",
      "cally/production",
    );

    // ========================================
    // DynamoDB Core Table (Single-Table Design)
    // ========================================
    this.coreTable = new dynamodb.Table(this, "CoreTable", {
      tableName: "cally-main",
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: false,
    });

    // GSI1: Inverted lookups
    // - Email → User: GSI1PK=USER#EMAIL#{email}
    // - Slug → Expert: GSI1PK=EXPERT#SLUG#{slug}
    this.coreTable.addGlobalSecondaryIndex({
      indexName: "GSI1",
      partitionKey: { name: "GSI1PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "GSI1SK", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI2: Time-based queries
    // - Sessions by date: GSI2PK=SESSION#DATE#{date}, GSI2SK={startTime}
    // - Expert sessions: GSI2PK=EXPERT#SESSION#{expertId}, GSI2SK={startTime}
    this.coreTable.addGlobalSecondaryIndex({
      indexName: "GSI2",
      partitionKey: { name: "GSI2PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "GSI2SK", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ========================================
    // S3 Bucket for Audio Files (TTS)
    // ========================================
    // Used for storing generated TTS audio for phone calls
    // Twilio needs public read access to fetch audio files
    this.audioBucket = new s3.Bucket(this, "AudioBucket", {
      bucketName: "cally-audio-files",
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: false,
        ignorePublicAcls: false,
        blockPublicPolicy: false,
        restrictPublicBuckets: false,
      }),
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      // Auto-delete old audio files to save costs
      lifecycleRules: [
        {
          id: "DeleteOldBriefings",
          prefix: "briefings/",
          expiration: cdk.Duration.days(7),
          enabled: true,
        },
        {
          id: "DeleteOldTranscripts",
          prefix: "transcripts/",
          expiration: cdk.Duration.days(30),
          enabled: true,
        },
      ],
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
          allowedOrigins: ["*"],
          allowedHeaders: ["*"],
        },
      ],
    });

    // Allow public read access to briefings folder
    this.audioBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.AnyPrincipal()],
        actions: ["s3:GetObject"],
        resources: [`${this.audioBucket.bucketArn}/briefings/*`],
      }),
    );

    // ========================================
    // SQS Queue for Transcription Processing
    // ========================================
    const transcriptionDlq = new sqs.Queue(this, "TranscriptionDLQ", {
      queueName: "cally-transcription-dlq",
      retentionPeriod: cdk.Duration.days(14),
    });

    const transcriptionQueue = new sqs.Queue(this, "TranscriptionQueue", {
      queueName: "cally-transcription-queue",
      visibilityTimeout: cdk.Duration.minutes(15),
      retentionPeriod: cdk.Duration.days(7),
      deadLetterQueue: {
        queue: transcriptionDlq,
        maxReceiveCount: 3,
      },
    });

    // ========================================
    // Lambda: Transcription Processor
    // ========================================
    const transcriptionProcessor = new lambdaNodejs.NodejsFunction(
      this,
      "TranscriptionProcessor",
      {
        functionName: "cally-transcription-processor",
        entry: path.join(__dirname, "../lambda/cally-transcription-processor.ts"),
        handler: "handler",
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 512,
        timeout: cdk.Duration.minutes(15),
        environment: {
          DYNAMODB_TABLE: this.coreTable.tableName,
          S3_BUCKET: this.audioBucket.bucketName,
          SECRETS_NAME: "cally/production",
        },
        bundling: {
          minify: true,
          sourceMap: false,
          externalModules: ["@aws-sdk/*"],
        },
      },
    );

    // Grant Lambda permissions
    this.coreTable.grantReadWriteData(transcriptionProcessor);
    this.audioBucket.grantRead(transcriptionProcessor);
    appSecret.grantRead(transcriptionProcessor);

    // Add SQS event source
    transcriptionProcessor.addEventSource(
      new lambdaEventSources.SqsEventSource(transcriptionQueue, {
        batchSize: 1,
      }),
    );

    // ========================================
    // Cognito User Pool
    // ========================================
    this.userPool = new cognito.UserPool(this, "CallyUserPool", {
      userPoolName: "cally-users",
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
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // ========================================
    // Cognito Hosted UI Domain
    // ========================================
    // Using Cognito-provided domain prefix (simpler than custom domain)
    // Full domain: cally-auth.auth.ap-southeast-2.amazoncognito.com
    const cognitoDomain = this.userPool.addDomain("CallyHostedUIDomain", {
      cognitoDomain: {
        domainPrefix: "cally-auth",
      },
    });

    // ========================================
    // Google Identity Provider
    // ========================================
    const googleProvider = new cognito.UserPoolIdentityProviderGoogle(
      this,
      "GoogleProvider",
      {
        userPool: this.userPool,
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

    // ========================================
    // Cognito App Client
    // ========================================
    this.userPoolClient = this.userPool.addClient("CallyWebClient", {
      userPoolClientName: "cally-web",
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
          "http://localhost:3113/api/auth/google/callback",
          "https://proj-cally.vercel.app/api/auth/google/callback",
        ],
        logoutUrls: [
          "http://localhost:3113",
          "https://proj-cally.vercel.app",
        ],
      },
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.COGNITO,
        cognito.UserPoolClientIdentityProvider.GOOGLE,
      ],
      preventUserExistenceErrors: true,
    });

    // Ensure Google provider is created before the client
    this.userPoolClient.node.addDependency(googleProvider);

    // ========================================
    // Import Shared Tables (from yoga-go-core-stack)
    // ========================================
    // yoga-go-emails: Shared email storage for SES Lambda compatibility
    const emailsTable = dynamodb.Table.fromTableName(
      this,
      "EmailsTable",
      "yoga-go-emails",
    );

    // yoga-go-core: Domain lookups for SES email routing
    const yogaCoreTable = dynamodb.Table.fromTableName(
      this,
      "YogaCoreTable",
      "yoga-go-core",
    );

    // ========================================
    // IAM User for Vercel Deployment
    // ========================================
    const vercelUser = new iam.User(this, "VercelUser", {
      userName: "cally-vercel",
    });

    // DynamoDB access policy (cally-main + shared tables)
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
        // cally-main table
        this.coreTable.tableArn,
        `${this.coreTable.tableArn}/index/*`,
        // yoga-go-emails (shared for email storage)
        emailsTable.tableArn,
        `${emailsTable.tableArn}/index/*`,
        // yoga-go-core (shared for domain lookups)
        yogaCoreTable.tableArn,
        `${yogaCoreTable.tableArn}/index/*`,
      ],
    });

    // Cognito policy for user management
    const cognitoPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "cognito-idp:DescribeUserPool",
        "cognito-idp:DescribeUserPoolClient",
        "cognito-idp:GetUser",
        "cognito-idp:AdminGetUser",
      ],
      resources: [this.userPool.userPoolArn],
    });

    // SES policy for email identity management (us-west-2 for email receiving)
    const sesPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "ses:CreateEmailIdentity",
        "ses:DeleteEmailIdentity",
        "ses:GetEmailIdentity",
        "ses:PutEmailIdentityDkimAttributes",
        "ses:PutEmailIdentityMailFromAttributes",
      ],
      resources: ["arn:aws:ses:us-west-2:*:identity/*"],
    });

    // SES policy for sending emails (booking notifications, etc.)
    const sesEmailSendPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["ses:SendEmail", "ses:SendRawEmail"],
      resources: ["*"],
    });

    // S3 policy for audio file storage (TTS for phone calls)
    const s3Policy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket",
      ],
      resources: [
        this.audioBucket.bucketArn,
        `${this.audioBucket.bucketArn}/*`,
      ],
    });

    // SQS policy for sending transcription messages
    const sqsPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["sqs:SendMessage"],
      resources: [transcriptionQueue.queueArn],
    });

    // Create managed policy and attach to user
    const vercelPolicy = new iam.ManagedPolicy(this, "VercelPolicy", {
      managedPolicyName: "cally-vercel-policy",
      statements: [dynamoDbPolicy, cognitoPolicy, sesPolicy, sesEmailSendPolicy, s3Policy, sqsPolicy],
    });

    vercelUser.addManagedPolicy(vercelPolicy);

    // ========================================
    // Outputs
    // ========================================
    new cdk.CfnOutput(this, "CoreTableName", {
      value: this.coreTable.tableName,
      description: "Cally Core DynamoDB Table Name",
      exportName: "CallyCoreTableName",
    });

    new cdk.CfnOutput(this, "CoreTableArn", {
      value: this.coreTable.tableArn,
      description: "Cally Core DynamoDB Table ARN",
      exportName: "CallyCoreTableArn",
    });

    new cdk.CfnOutput(this, "AudioBucketName", {
      value: this.audioBucket.bucketName,
      description: "S3 Bucket for TTS audio files",
      exportName: "CallyAudioBucketName",
    });

    new cdk.CfnOutput(this, "UserPoolId", {
      value: this.userPool.userPoolId,
      description: "Cally Cognito User Pool ID",
      exportName: "CallyUserPoolId",
    });

    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: this.userPoolClient.userPoolClientId,
      description: "Cally Cognito User Pool Client ID",
      exportName: "CallyUserPoolClientId",
    });

    new cdk.CfnOutput(this, "CognitoDomain", {
      value: `${cognitoDomain.domainName}.auth.${this.region}.amazoncognito.com`,
      description: "Cally Cognito Hosted UI Domain",
      exportName: "CallyCognitoDomain",
    });

    new cdk.CfnOutput(this, "CognitoRegion", {
      value: this.region,
      description: "AWS Region for Cognito",
      exportName: "CallyCognitoRegion",
    });

    new cdk.CfnOutput(this, "VercelUserArn", {
      value: vercelUser.userArn,
      description:
        "IAM User ARN for Vercel - create access keys in AWS Console",
      exportName: "CallyVercelUserArn",
    });

    new cdk.CfnOutput(this, "TranscriptionQueueUrl", {
      value: transcriptionQueue.queueUrl,
      description: "SQS Queue URL for transcription processing",
      exportName: "CallyTranscriptionQueueUrl",
    });

    // Note: Client secret can be retrieved from AWS Console or CLI:
    // aws cognito-idp describe-user-pool-client --user-pool-id <pool-id> --client-id <client-id>
    new cdk.CfnOutput(this, "Note_ClientSecret", {
      value:
        "Retrieve client secret from AWS Console: Cognito > User Pools > cally-users > App clients > cally-web",
      description: "How to get the client secret",
    });
  }
}
