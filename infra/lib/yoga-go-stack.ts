import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ses from 'aws-cdk-lib/aws-ses';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejsLambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import type { Construct } from 'constructs';
import type { SharedInfraStack } from './shared-infra-stack';

export interface YogaGoStackProps extends cdk.StackProps {
  /** Reference to the shared infrastructure stack */
  sharedInfra: SharedInfraStack;
  /** Listener rule priority (must be unique across all apps, lower = higher priority) */
  listenerRulePriority?: number;
}

/**
 * Yoga Go Application Stack
 *
 * Contains app-specific resources:
 * - ECR Repository
 * - ECS Service + Task Definition
 * - Target Group + Listener Rule
 * - Cognito User Pool
 * - DynamoDB Tables
 * - SES Email Configuration
 * - Route 53 Hosted Zone + DNS Records
 *
 * Uses shared resources from SharedInfraStack:
 * - VPC, ALB, HTTPS Listener, ECS Cluster, Capacity Provider, Security Groups
 */
export class YogaGoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: YogaGoStackProps) {
    super(scope, id, props);

    const { sharedInfra, listenerRulePriority = 10 } = props;

    // ========================================
    // ECR Repository for Docker images (import existing)
    // ========================================
    // The repository was created by the previous stack with RETAIN policy
    // so we import it instead of creating a new one
    const repository = ecr.Repository.fromRepositoryName(
      this,
      'YogaGoRepository',
      'yoga-go'
    );

    // ========================================
    // Cognito User Pool
    // ========================================
    const userPool = new cognito.UserPool(this, 'YogaGoUserPool', {
      userPoolName: 'yoga-go-users',
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
    });

    const userPoolDomain = userPool.addDomain('YogaGoDomain', {
      cognitoDomain: { domainPrefix: 'yoga-go-auth' },
    });

    // ========================================
    // Secrets Manager
    // ========================================
    const appSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      'AppSecret',
      'yoga-go/production'
    );

    // ========================================
    // Google & Facebook Identity Providers
    // ========================================
    const googleProvider = new cognito.UserPoolIdentityProviderGoogle(
      this,
      'GoogleProvider',
      {
        userPool,
        clientId: appSecret.secretValueFromJson('GOOGLE_CLIENT_ID').unsafeUnwrap(),
        clientSecretValue: appSecret.secretValueFromJson('GOOGLE_CLIENT_SECRET'),
        scopes: ['email', 'profile', 'openid'],
        attributeMapping: {
          email: cognito.ProviderAttribute.GOOGLE_EMAIL,
          fullname: cognito.ProviderAttribute.GOOGLE_NAME,
          profilePicture: cognito.ProviderAttribute.GOOGLE_PICTURE,
        },
      }
    );

    const facebookProvider = new cognito.UserPoolIdentityProviderFacebook(
      this,
      'FacebookProvider',
      {
        userPool,
        clientId: appSecret.secretValueFromJson('FACEBOOK_APP_ID').unsafeUnwrap(),
        clientSecret: appSecret
          .secretValueFromJson('FACEBOOK_APP_SECRET')
          .unsafeUnwrap(),
        scopes: ['email', 'public_profile'],
        attributeMapping: {
          email: cognito.ProviderAttribute.FACEBOOK_EMAIL,
          fullname: cognito.ProviderAttribute.FACEBOOK_NAME,
        },
      }
    );

    // ========================================
    // Cognito App Client
    // ========================================
    const appClient = userPool.addClient('YogaGoWebClient', {
      userPoolClientName: 'yoga-go-web',
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
          'http://localhost:3111/api/auth/callback/cognito',
          'https://myyoga.guru/api/auth/callback/cognito',
          'https://www.myyoga.guru/api/auth/callback/cognito',
          'http://localhost:3111/api/auth/google/callback',
          'https://myyoga.guru/api/auth/google/callback',
          'https://www.myyoga.guru/api/auth/google/callback',
          'http://localhost:3111/api/auth/facebook/callback',
          'https://myyoga.guru/api/auth/facebook/callback',
          'https://www.myyoga.guru/api/auth/facebook/callback',
        ],
        logoutUrls: [
          'http://localhost:3111',
          'https://myyoga.guru',
          'https://www.myyoga.guru',
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
    // Route 53 DNS Records (Hosted Zone from SharedInfraStack)
    // ========================================
    const hostedZone = sharedInfra.hostedZones.get('myyoga.guru');
    if (!hostedZone) {
      throw new Error('Hosted zone for myyoga.guru not found in SharedInfraStack');
    }

    // ALIAS records pointing to shared ALB
    new route53.ARecord(this, 'ApexAliasRecord', {
      zone: hostedZone,
      recordName: '',
      target: route53.RecordTarget.fromAlias(
        new route53Targets.LoadBalancerTarget(sharedInfra.alb)
      ),
      comment: 'Apex domain pointing to shared ALB',
    });

    new route53.ARecord(this, 'WwwAliasRecord', {
      zone: hostedZone,
      recordName: 'www',
      target: route53.RecordTarget.fromAlias(
        new route53Targets.LoadBalancerTarget(sharedInfra.alb)
      ),
      comment: 'WWW subdomain pointing to shared ALB',
    });

    // ========================================
    // AWS SES - Email Service
    // ========================================
    const emailIdentity = new ses.EmailIdentity(this, 'EmailIdentity', {
      identity: ses.Identity.publicHostedZone(hostedZone),
      mailFromDomain: 'mail.myyoga.guru',
    });

    const sesConfigSet = new ses.ConfigurationSet(this, 'SesConfigSet', {
      configurationSetName: 'yoga-go-emails',
      sendingEnabled: true,
      reputationMetrics: true,
    });

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
    const welcomeEmailTemplate = new ses.CfnTemplate(this, 'WelcomeEmailTemplate', {
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

    const invoiceEmailTemplate = new ses.CfnTemplate(this, 'InvoiceEmailTemplate', {
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
    // Welcome Email Lambda (Cognito Trigger)
    // ========================================
    const welcomeEmailLambda = new nodejsLambda.NodejsFunction(
      this,
      'WelcomeEmailLambda',
      {
        functionName: 'yoga-go-welcome-email',
        runtime: lambda.Runtime.NODEJS_22_X,
        handler: 'handler',
        entry: path.join(__dirname, '../lambda/welcome-email.ts'),
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
          SES_FROM_EMAIL: 'hi@myyoga.guru',
          SES_CONFIG_SET: sesConfigSet.configurationSetName,
          SES_WELCOME_TEMPLATE: 'yoga-go-welcome',
        },
        bundling: { minify: true, sourceMap: false },
      }
    );

    welcomeEmailLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['ses:SendEmail', 'ses:SendRawEmail', 'ses:SendTemplatedEmail'],
        resources: ['*'],
        conditions: { StringEquals: { 'ses:FromAddress': 'hi@myyoga.guru' } },
      })
    );

    userPool.addTrigger(cognito.UserPoolOperation.POST_CONFIRMATION, welcomeEmailLambda);

    // ========================================
    // CloudWatch Log Group
    // ========================================
    const logGroup = new logs.LogGroup(this, 'EcsLogGroup', {
      logGroupName: '/ecs/yoga-go',
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ========================================
    // DynamoDB Tables
    // ========================================
    const coreTable = new dynamodb.Table(this, 'CoreTable', {
      tableName: 'yoga-go-core',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: false,
    });

    coreTable.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const calendarTable = new dynamodb.Table(this, 'CalendarTable', {
      tableName: 'yoga-go-calendar',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: false,
    });

    const ordersTable = new dynamodb.Table(this, 'OrdersTable', {
      tableName: 'yoga-go-orders',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: false,
    });

    const analyticsTable = new dynamodb.Table(this, 'AnalyticsTable', {
      tableName: 'yoga-go-analytics',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: false,
    });

    const discussionsTable = new dynamodb.Table(this, 'DiscussionsTable', {
      tableName: 'yoga-go-discussions',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: false,
    });

    discussionsTable.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ========================================
    // IAM Roles for ECS Tasks
    // ========================================
    const taskExecutionRole = new iam.Role(this, 'EcsTaskExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AmazonECSTaskExecutionRolePolicy'
        ),
      ],
    });

    appSecret.grantRead(taskExecutionRole);

    const taskRole = new iam.Role(this, 'EcsTaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: 'Role used by the Yoga Go application',
    });

    // Grant DynamoDB access
    coreTable.grantReadWriteData(taskRole);
    calendarTable.grantReadWriteData(taskRole);
    ordersTable.grantReadWriteData(taskRole);
    analyticsTable.grantReadWriteData(taskRole);
    discussionsTable.grantReadWriteData(taskRole);

    // Grant SES access
    taskRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['ses:SendEmail', 'ses:SendRawEmail'],
        resources: ['*'],
        conditions: { StringEquals: { 'ses:FromAddress': 'hi@myyoga.guru' } },
      })
    );

    // ========================================
    // ALB Target Group
    // ========================================
    const targetGroup = new elbv2.ApplicationTargetGroup(this, 'YogaGoTargetGroup', {
      vpc: sharedInfra.vpc,
      port: 3000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.INSTANCE,
      healthCheck: {
        path: '/api/health',
        healthyHttpCodes: '200',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
      },
      deregistrationDelay: cdk.Duration.seconds(30),
    });

    // ========================================
    // ALB Listener Rule (Host-based routing)
    // ========================================
    new elbv2.ApplicationListenerRule(this, 'YogaGoListenerRule', {
      listener: sharedInfra.httpsListener,
      priority: listenerRulePriority,
      conditions: [
        elbv2.ListenerCondition.hostHeaders(['myyoga.guru', 'www.myyoga.guru']),
      ],
      action: elbv2.ListenerAction.forward([targetGroup]),
    });

    // ========================================
    // ECS Task Definition
    // ========================================
    const taskDefinition = new ecs.Ec2TaskDefinition(this, 'YogaGoTaskDef', {
      family: 'yoga-go',
      executionRole: taskExecutionRole,
      taskRole,
      networkMode: ecs.NetworkMode.BRIDGE,
    });

    const container = taskDefinition.addContainer('yoga-go-container', {
      image: ecs.ContainerImage.fromEcrRepository(repository, 'latest'),
      memoryLimitMiB: 512,
      cpu: 256,
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'yoga-go', logGroup }),
      environment: {
        NODE_ENV: 'production',
        PORT: '3000',
        AWS_REGION: this.region,
        // DynamoDB table names are hardcoded in src/lib/dynamodb.ts
        COGNITO_USER_POOL_ID: userPool.userPoolId,
        COGNITO_CLIENT_ID: appClient.userPoolClientId,
        COGNITO_ISSUER: `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}`,
        NEXTAUTH_URL: 'https://www.myyoga.guru',
        SES_FROM_EMAIL: 'hi@myyoga.guru',
        SES_CONFIG_SET: sesConfigSet.configurationSetName,
      },
      secrets: {
        MONGODB_URI: ecs.Secret.fromSecretsManager(appSecret, 'MONGODB_URI'),
        NEXTAUTH_SECRET: ecs.Secret.fromSecretsManager(appSecret, 'NEXTAUTH_SECRET'),
        EXPERT_SIGNUP_CODE: ecs.Secret.fromSecretsManager(appSecret, 'EXPERT_SIGNUP_CODE'),
        COGNITO_CLIENT_SECRET: ecs.Secret.fromSecretsManager(
          appSecret,
          'COGNITO_CLIENT_SECRET'
        ),
      },
      healthCheck: {
        command: [
          'CMD-SHELL',
          "node -e \"require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})\"",
        ],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
        startPeriod: cdk.Duration.seconds(60),
      },
    });

    container.addPortMappings({
      containerPort: 3000,
      hostPort: 0,
      protocol: ecs.Protocol.TCP,
    });

    // ========================================
    // ECS Service (using shared cluster)
    // ========================================
    const service = new ecs.Ec2Service(this, 'YogaGoService', {
      cluster: sharedInfra.cluster,
      serviceName: 'yoga-go-service',
      taskDefinition,
      desiredCount: 1,
      capacityProviderStrategies: [
        {
          capacityProvider: sharedInfra.capacityProvider.capacityProviderName,
          weight: 1,
        },
      ],
      minHealthyPercent: 0,
      maxHealthyPercent: 100,
      healthCheckGracePeriod: cdk.Duration.seconds(120),
    });

    service.attachToApplicationTargetGroup(targetGroup);

    // ========================================
    // Outputs
    // ========================================
    new cdk.CfnOutput(this, 'RepositoryUri', {
      value: repository.repositoryUri,
      description: 'ECR repository URI',
      exportName: 'YogaGoRepositoryUri',
    });

    new cdk.CfnOutput(this, 'RepositoryName', {
      value: repository.repositoryName,
      description: 'ECR repository name',
      exportName: 'YogaGoRepositoryName',
    });

    new cdk.CfnOutput(this, 'ServiceName', {
      value: service.serviceName,
      description: 'ECS service name',
      exportName: 'YogaGoServiceName',
    });

    new cdk.CfnOutput(this, 'LogGroupName', {
      value: logGroup.logGroupName,
      description: 'CloudWatch log group name',
      exportName: 'YogaGoLogGroupName',
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: 'YogaGoUserPoolId',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: appClient.userPoolClientId,
      description: 'Cognito App Client ID',
      exportName: 'YogaGoUserPoolClientId',
    });

    new cdk.CfnOutput(this, 'CognitoDomain', {
      value: `${userPoolDomain.domainName}.auth.${this.region}.amazoncognito.com`,
      description: 'Cognito Hosted UI Domain',
      exportName: 'YogaGoCognitoDomain',
    });

    new cdk.CfnOutput(this, 'DynamoDBCoreTableName', {
      value: coreTable.tableName,
      description: 'DynamoDB Core Table Name',
      exportName: 'YogaGoDynamoDBCoreTableName',
    });
  }
}
