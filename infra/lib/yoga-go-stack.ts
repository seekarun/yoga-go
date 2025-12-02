import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ses from 'aws-cdk-lib/aws-ses';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejsLambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import type { Construct } from 'constructs';

export class YogaGoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ========================================
    // ECR Repository for Docker images
    // ========================================
    const repository = new ecr.Repository(this, 'YogaGoRepository', {
      repositoryName: 'yoga-go',
      imageScanOnPush: true, // Security: Scan images for vulnerabilities
      imageTagMutability: ecr.TagMutability.MUTABLE, // Allow tag updates (e.g., 'latest')

      // Lifecycle policy to manage image retention (free tier: 500 MB)
      lifecycleRules: [
        {
          description: 'Remove untagged images after 1 day',
          maxImageAge: cdk.Duration.days(1),
          rulePriority: 1,
          tagStatus: ecr.TagStatus.UNTAGGED,
        },
        {
          description: 'Keep last 10 images',
          maxImageCount: 10,
          rulePriority: 2,
          tagStatus: ecr.TagStatus.ANY,
        },
      ],

      // Prevent accidental deletion
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // ========================================
    // VPC - Use Default VPC (Free Tier Optimized)
    // ========================================
    const vpc = ec2.Vpc.fromLookup(this, 'DefaultVPC', {
      isDefault: true,
    });

    // ========================================
    // Security Group for ALB
    // ========================================
    const albSecurityGroup = new ec2.SecurityGroup(this, 'AlbSecurityGroup', {
      vpc,
      description: 'Security group for Application Load Balancer',
      allowAllOutbound: true,
    });

    // Allow HTTP traffic to ALB (will redirect to HTTPS)
    albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow HTTP traffic from anywhere'
    );

    // Allow HTTPS traffic to ALB
    albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allow HTTPS traffic from anywhere'
    );

    // ========================================
    // Security Group for ECS Tasks
    // ========================================
    const ecsSecurityGroup = new ec2.SecurityGroup(this, 'EcsSecurityGroup', {
      vpc,
      description: 'Security group for Yoga Go ECS tasks',
      allowAllOutbound: true, // Required for ECR, MongoDB Atlas, etc.
    });

    // Allow traffic from ALB on ephemeral ports (dynamic port mapping)
    ecsSecurityGroup.addIngressRule(
      albSecurityGroup,
      ec2.Port.tcpRange(32768, 65535),
      'Allow traffic from ALB on dynamic ports'
    );

    // Allow SSH for debugging (optional - can remove for production)
    ecsSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22),
      'Allow SSH for debugging'
    );

    // ========================================
    // Cognito User Pool
    // ========================================
    const userPool = new cognito.UserPool(this, 'YogaGoUserPool', {
      userPoolName: 'yoga-go-users',
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        fullname: {
          required: false,
          mutable: true,
        },
        // Note: phone_number and picture already exist in Cognito by default
        // No need to define them here - they're used via Google identity provider mapping
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
      mfaSecondFactor: {
        sms: false,
        otp: true, // TOTP authenticator apps
      },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // ========================================
    // Cognito User Pool Domain (Hosted UI)
    // ========================================
    const userPoolDomain = userPool.addDomain('YogaGoDomain', {
      cognitoDomain: {
        domainPrefix: 'yoga-go-auth',
      },
    });

    // ========================================
    // Secrets Manager Secret (for environment variables)
    // ========================================
    // Import existing secret - CDK will NOT overwrite its values
    // Create the secret manually in AWS Console with these keys:
    // - MONGODB_URI
    // - NEXTAUTH_SECRET
    // - EXPERT_SIGNUP_CODE
    // - COGNITO_CLIENT_SECRET
    // - GOOGLE_CLIENT_ID (from Google Developer Console)
    // - GOOGLE_CLIENT_SECRET (from Google Developer Console)
    const appSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      'AppSecret',
      'yoga-go/production'
    );

    // ========================================
    // Google Identity Provider
    // ========================================
    // Prerequisites: Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to Secrets Manager
    const googleProvider = new cognito.UserPoolIdentityProviderGoogle(this, 'GoogleProvider', {
      userPool,
      clientId: appSecret.secretValueFromJson('GOOGLE_CLIENT_ID').unsafeUnwrap(),
      clientSecretValue: appSecret.secretValueFromJson('GOOGLE_CLIENT_SECRET'),
      scopes: ['email', 'profile', 'openid'],
      attributeMapping: {
        email: cognito.ProviderAttribute.GOOGLE_EMAIL,
        fullname: cognito.ProviderAttribute.GOOGLE_NAME,
        profilePicture: cognito.ProviderAttribute.GOOGLE_PICTURE,
      },
    });

    // ========================================
    // Facebook Identity Provider
    // ========================================
    // Prerequisites: Add FACEBOOK_APP_ID and FACEBOOK_APP_SECRET to Secrets Manager
    const facebookProvider = new cognito.UserPoolIdentityProviderFacebook(
      this,
      'FacebookProvider',
      {
        userPool,
        clientId: appSecret.secretValueFromJson('FACEBOOK_APP_ID').unsafeUnwrap(),
        clientSecret: appSecret.secretValueFromJson('FACEBOOK_APP_SECRET').unsafeUnwrap(),
        scopes: ['email', 'public_profile'],
        attributeMapping: {
          email: cognito.ProviderAttribute.FACEBOOK_EMAIL,
          fullname: cognito.ProviderAttribute.FACEBOOK_NAME,
          // Facebook profile picture is accessed via Graph API, not as a standard attribute
        },
      }
    );

    // ========================================
    // Cognito App Client (Email/Password + Google + Facebook)
    // ========================================
    const appClient = userPool.addClient('YogaGoWebClient', {
      userPoolClientName: 'yoga-go-web',
      generateSecret: true,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [cognito.OAuthScope.EMAIL, cognito.OAuthScope.OPENID, cognito.OAuthScope.PROFILE],
        callbackUrls: [
          'http://localhost:3111/api/auth/callback/cognito',
          'https://myyoga.guru/api/auth/callback/cognito',
          'https://www.myyoga.guru/api/auth/callback/cognito',
          // Google OAuth callback URLs
          'http://localhost:3111/api/auth/google/callback',
          'https://myyoga.guru/api/auth/google/callback',
          'https://www.myyoga.guru/api/auth/google/callback',
          // Facebook OAuth callback URLs
          'http://localhost:3111/api/auth/facebook/callback',
          'https://myyoga.guru/api/auth/facebook/callback',
          'https://www.myyoga.guru/api/auth/facebook/callback',
        ],
        logoutUrls: ['http://localhost:3111', 'https://myyoga.guru', 'https://www.myyoga.guru'],
      },
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.COGNITO,
        cognito.UserPoolClientIdentityProvider.GOOGLE,
        cognito.UserPoolClientIdentityProvider.FACEBOOK,
      ],
      preventUserExistenceErrors: true,
    });

    // Ensure identity providers are created before the app client
    appClient.node.addDependency(googleProvider);
    appClient.node.addDependency(facebookProvider);

    // ========================================
    // ACM Certificate for HTTPS (DNS Validated)
    // ========================================
    // After deployment, add CNAME records in Namecheap for DNS validation
    // Check AWS Console > ACM for the required CNAME records
    const certificate = new acm.Certificate(this, 'YogaGoCertificate', {
      domainName: 'myyoga.guru',
      subjectAlternativeNames: ['*.myyoga.guru'],
      validation: acm.CertificateValidation.fromDns(),
    });

    // ========================================
    // Application Load Balancer
    // ========================================
    const alb = new elbv2.ApplicationLoadBalancer(this, 'YogaGoALB', {
      vpc,
      internetFacing: true,
      securityGroup: albSecurityGroup,
      loadBalancerName: 'yoga-go-alb',
    });

    // ========================================
    // ALB Target Group
    // ========================================
    const targetGroup = new elbv2.ApplicationTargetGroup(this, 'YogaGoTargetGroup', {
      vpc,
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
    // ALB Listeners
    // ========================================
    // HTTPS Listener (port 443) - serves traffic
    alb.addListener('HttpsListener', {
      port: 443,
      certificates: [certificate],
      defaultTargetGroups: [targetGroup],
    });

    // HTTP Listener (port 80) - redirects to HTTPS
    alb.addListener('HttpListener', {
      port: 80,
      defaultAction: elbv2.ListenerAction.redirect({
        protocol: 'HTTPS',
        port: '443',
        permanent: true,
      }),
    });

    // ========================================
    // Route 53 Hosted Zone & DNS Records
    // ========================================
    // Create hosted zone for myyoga.guru
    // After deployment, update nameservers at Namecheap to point to Route 53
    const hostedZone = new route53.HostedZone(this, 'YogaGoHostedZone', {
      zoneName: 'myyoga.guru',
      comment: 'Hosted zone for myyoga.guru - managed by CDK',
    });

    // ALIAS record for apex domain (myyoga.guru -> ALB)
    new route53.ARecord(this, 'ApexAliasRecord', {
      zone: hostedZone,
      recordName: '', // Empty string = apex domain
      target: route53.RecordTarget.fromAlias(new route53Targets.LoadBalancerTarget(alb)),
      comment: 'Apex domain pointing to ALB',
    });

    // ALIAS record for www subdomain (www.myyoga.guru -> ALB)
    new route53.ARecord(this, 'WwwAliasRecord', {
      zone: hostedZone,
      recordName: 'www',
      target: route53.RecordTarget.fromAlias(new route53Targets.LoadBalancerTarget(alb)),
      comment: 'WWW subdomain pointing to ALB',
    });

    // ========================================
    // AWS SES - Email Service
    // ========================================
    // Domain identity for sending emails from myyoga.guru
    // This automatically creates DKIM records in Route 53
    const emailIdentity = new ses.EmailIdentity(this, 'EmailIdentity', {
      identity: ses.Identity.publicHostedZone(hostedZone),
      mailFromDomain: 'mail.myyoga.guru',
    });

    // Configuration set for email tracking (opens, clicks, bounces, etc.)
    const sesConfigSet = new ses.ConfigurationSet(this, 'SesConfigSet', {
      configurationSetName: 'yoga-go-emails',
      sendingEnabled: true,
      reputationMetrics: true,
    });

    // Add CloudWatch destination for email event tracking
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

We're thrilled to have you join our community of yoga enthusiasts. Whether you're a beginner or an experienced practitioner, we have courses designed just for you.

Here's what you can do next:
- Browse our expert-led courses
- Start your first lesson
- Connect with our yoga instructors

If you have any questions, feel free to reach out to us.

Namaste,
The MyYoga.Guru Team

---
Visit us at https://www.myyoga.guru`,
        htmlPart: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #6366f1; margin: 0;">🧘 MyYoga.Guru</h1>
  </div>

  <h2 style="color: #1f2937;">Hi {{name}}!</h2>

  <p>Welcome to <strong>MyYoga.Guru</strong>!</p>

  <p>We're thrilled to have you join our community of yoga enthusiasts. Whether you're a beginner or an experienced practitioner, we have courses designed just for you.</p>

  <h3 style="color: #4f46e5;">Here's what you can do next:</h3>
  <ul style="padding-left: 20px;">
    <li>📚 Browse our expert-led courses</li>
    <li>▶️ Start your first lesson</li>
    <li>🤝 Connect with our yoga instructors</li>
  </ul>

  <div style="text-align: center; margin: 30px 0;">
    <a href="https://www.myyoga.guru/app" style="background-color: #6366f1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">Start Exploring</a>
  </div>

  <p>If you have any questions, feel free to reach out to us.</p>

  <p style="margin-top: 30px;">
    <strong>Namaste,</strong><br>
    The MyYoga.Guru Team
  </p>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

  <p style="color: #6b7280; font-size: 12px; text-align: center;">
    <a href="https://www.myyoga.guru" style="color: #6366f1;">www.myyoga.guru</a>
  </p>
</body>
</html>`,
      },
    });

    // Invoice/Payment Confirmation Template
    const invoiceEmailTemplate = new ses.CfnTemplate(this, 'InvoiceEmailTemplate', {
      template: {
        templateName: 'yoga-go-invoice',
        subjectPart: 'Payment Confirmation - Order #{{orderId}} 🧘',
        textPart: `Hi {{customerName}},

Thank you for your purchase!

===========================================
INVOICE
===========================================

Order ID: {{orderId}}
Date: {{orderDate}}
Payment Method: {{paymentMethod}}

-------------------------------------------
ITEM DETAILS
-------------------------------------------
{{itemName}}
{{itemDescription}}

-------------------------------------------
PAYMENT SUMMARY
-------------------------------------------
Subtotal: {{currency}} {{amount}}
Total: {{currency}} {{amount}}

Payment Status: PAID

-------------------------------------------

You now have full access to your purchased content. Start learning now at:
https://www.myyoga.guru/app

If you have any questions about your purchase, please contact us at support@myyoga.guru

Namaste,
The MyYoga.Guru Team

---
This is an automated receipt for your records.
Transaction ID: {{transactionId}}`,
        htmlPart: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #6366f1; padding-bottom: 20px;">
      <h1 style="color: #6366f1; margin: 0; font-size: 24px;">🧘 MyYoga.Guru</h1>
      <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 14px;">Payment Confirmation</p>
    </div>

    <!-- Greeting -->
    <p style="font-size: 16px;">Hi <strong>{{customerName}}</strong>,</p>
    <p>Thank you for your purchase! Your payment has been successfully processed.</p>

    <!-- Invoice Box -->
    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Order ID</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">{{orderId}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Date</td>
          <td style="padding: 8px 0; text-align: right;">{{orderDate}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Payment Method</td>
          <td style="padding: 8px 0; text-align: right;">{{paymentMethod}}</td>
        </tr>
      </table>
    </div>

    <!-- Item Details -->
    <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 16px;">📚 Item Purchased</h3>
      <p style="margin: 0; font-weight: 600; color: #1f2937;">{{itemName}}</p>
      <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">{{itemDescription}}</p>
    </div>

    <!-- Payment Summary -->
    <div style="background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-size: 14px;">Subtotal</td>
          <td style="padding: 8px 0; text-align: right;">{{currency}} {{amount}}</td>
        </tr>
        <tr style="border-top: 2px solid #86efac;">
          <td style="padding: 12px 0 8px 0; font-weight: 700; font-size: 16px;">Total Paid</td>
          <td style="padding: 12px 0 8px 0; text-align: right; font-weight: 700; font-size: 18px; color: #16a34a;">{{currency}} {{amount}}</td>
        </tr>
      </table>
      <div style="text-align: center; margin-top: 10px;">
        <span style="background-color: #16a34a; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">✓ PAID</span>
      </div>
    </div>

    <!-- CTA -->
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://www.myyoga.guru/app" style="background-color: #6366f1; color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Start Learning Now</a>
    </div>

    <!-- Footer -->
    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
      <p style="margin: 0; color: #6b7280; font-size: 14px;">If you have any questions, contact us at <a href="mailto:support@myyoga.guru" style="color: #6366f1;">support@myyoga.guru</a></p>
      <p style="margin-top: 20px;"><strong>Namaste,</strong><br>The MyYoga.Guru Team</p>
    </div>

    <!-- Transaction ID -->
    <p style="color: #9ca3af; font-size: 11px; text-align: center; margin-top: 30px;">
      Transaction ID: {{transactionId}}
    </p>
  </div>
</body>
</html>`,
      },
    });

    // ========================================
    // Welcome Email Lambda (Cognito Trigger)
    // ========================================
    const welcomeEmailLambda = new nodejsLambda.NodejsFunction(this, 'WelcomeEmailLambda', {
      functionName: 'yoga-go-welcome-email',
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'handler',
      entry: path.join(__dirname, '../lambda/welcome-email.ts'),
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        // Note: AWS_REGION is automatically set by Lambda runtime
        SES_FROM_EMAIL: 'hi@myyoga.guru',
        SES_CONFIG_SET: sesConfigSet.configurationSetName,
        SES_WELCOME_TEMPLATE: 'yoga-go-welcome',
      },
      bundling: {
        minify: true,
        sourceMap: false,
      },
    });

    // Grant Lambda permission to send emails via SES
    welcomeEmailLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['ses:SendEmail', 'ses:SendRawEmail', 'ses:SendTemplatedEmail'],
        resources: ['*'],
        conditions: {
          StringEquals: {
            'ses:FromAddress': 'hi@myyoga.guru',
          },
        },
      })
    );

    // Add Lambda as Post Confirmation trigger to Cognito User Pool
    userPool.addTrigger(cognito.UserPoolOperation.POST_CONFIRMATION, welcomeEmailLambda);

    // ========================================
    // CloudWatch Log Group
    // ========================================
    const logGroup = new logs.LogGroup(this, 'EcsLogGroup', {
      logGroupName: '/ecs/yoga-go',
      retention: logs.RetentionDays.ONE_WEEK, // Free tier: 5GB ingestion
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Clean up on stack deletion
    });

    // ========================================
    // ECS Cluster
    // ========================================
    const cluster = new ecs.Cluster(this, 'YogaGoCluster', {
      clusterName: 'yoga-go-cluster',
      vpc,
      containerInsights: false, // Disable to save costs (not free tier)
    });

    // ========================================
    // IAM Role for EC2 Instances
    // ========================================
    const instanceRole = new iam.Role(this, 'EcsInstanceRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AmazonEC2ContainerServiceforEC2Role'
        ),
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'AmazonSSMManagedInstanceCore' // For Systems Manager Session Manager
        ),
      ],
    });

    // ========================================
    // Auto Scaling Group with ECS-Optimized AMI
    // ========================================
    const autoScalingGroup = new autoscaling.AutoScalingGroup(this, 'EcsAutoScalingGroup', {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC }, // Public subnets (no NAT Gateway needed)
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MICRO // Free tier: 750 hours/month
      ),
      machineImage: ecs.EcsOptimizedImage.amazonLinux2(),
      role: instanceRole,
      minCapacity: 1,
      maxCapacity: 1, // Single instance for free tier
      desiredCapacity: 1,
      securityGroup: ecsSecurityGroup,
      associatePublicIpAddress: true, // Required for public subnet
      newInstancesProtectedFromScaleIn: false,
    });

    // ========================================
    // ECS Capacity Provider
    // ========================================
    const capacityProvider = new ecs.AsgCapacityProvider(this, 'EcsCapacityProvider', {
      autoScalingGroup,
      enableManagedTerminationProtection: false,
    });

    cluster.addAsgCapacityProvider(capacityProvider);

    // ========================================
    // IAM Role for ECS Task Execution
    // ========================================
    const taskExecutionRole = new iam.Role(this, 'EcsTaskExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
      ],
    });

    // Grant permission to read secrets
    appSecret.grantRead(taskExecutionRole);

    // ========================================
    // IAM Role for ECS Task (Application Runtime)
    // ========================================
    const taskRole = new iam.Role(this, 'EcsTaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: 'Role used by the Yoga Go application',
    });

    // ========================================
    // DynamoDB Tables (5-Table Design)
    // ========================================

    // ----------------------------------------
    // 1. CORE TABLE - Main business entities
    // ----------------------------------------
    // Entities: User, Expert, Course, Lesson, CourseProgress, Asset, Survey, SurveyResponse
    const coreTable = new dynamodb.Table(this, 'CoreTable', {
      tableName: 'core',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: false,
    });

    // GSI1: For courses by instructor lookup
    coreTable.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ----------------------------------------
    // 2. CALENDAR TABLE - Scheduling & live sessions
    // ----------------------------------------
    // Entities: LiveSession, LiveSessionParticipant, Availability
    // Uses dual-write pattern for multiple access patterns (no GSIs)
    const calendarTable = new dynamodb.Table(this, 'CalendarTable', {
      tableName: 'calendar',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: false,
    });

    // ----------------------------------------
    // 3. ORDERS TABLE - Payments
    // ----------------------------------------
    // Entities: Payment (dual-write for user lookup and intent lookup)
    const ordersTable = new dynamodb.Table(this, 'OrdersTable', {
      tableName: 'orders',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: false,
    });

    // ----------------------------------------
    // 4. ANALYTICS TABLE - Course analytics events
    // ----------------------------------------
    // Entities: CourseAnalyticsEvent (simple time-series)
    const analyticsTable = new dynamodb.Table(this, 'AnalyticsTable', {
      tableName: 'analytics',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: false,
    });

    // ----------------------------------------
    // 5. DISCUSSIONS TABLE - Discussions and votes
    // ----------------------------------------
    // Entities: Discussion, DiscussionVote (dual-write for efficient lookups)
    const discussionsTable = new dynamodb.Table(this, 'DiscussionsTable', {
      tableName: 'discussions',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: false,
    });

    // GSI1: For replies and top-level discussions lookup
    discussionsTable.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Grant ECS task role read/write access to all DynamoDB tables
    coreTable.grantReadWriteData(taskRole);
    calendarTable.grantReadWriteData(taskRole);
    ordersTable.grantReadWriteData(taskRole);
    analyticsTable.grantReadWriteData(taskRole);
    discussionsTable.grantReadWriteData(taskRole);

    // Grant SES send permissions to the task role
    taskRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['ses:SendEmail', 'ses:SendRawEmail'],
        resources: ['*'],
        conditions: {
          StringEquals: {
            'ses:FromAddress': 'hi@myyoga.guru',
          },
        },
      })
    );

    // ========================================
    // ECS Task Definition
    // ========================================
    const taskDefinition = new ecs.Ec2TaskDefinition(this, 'YogaGoTaskDef', {
      family: 'yoga-go',
      executionRole: taskExecutionRole,
      taskRole,
      networkMode: ecs.NetworkMode.BRIDGE, // Bridge mode for EC2 launch type
    });

    // Add container to task definition
    const container = taskDefinition.addContainer('yoga-go-container', {
      image: ecs.ContainerImage.fromEcrRepository(repository, 'latest'),
      memoryLimitMiB: 512,
      cpu: 256,
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'yoga-go',
        logGroup,
      }),
      environment: {
        NODE_ENV: 'production',
        PORT: '3000',
        // AWS region (required for Cognito SDK and DynamoDB)
        AWS_REGION: this.region,
        // DynamoDB table names (5-table design)
        DYNAMODB_TABLE_CORE: coreTable.tableName,
        DYNAMODB_TABLE_CALENDAR: calendarTable.tableName,
        DYNAMODB_TABLE_ORDERS: ordersTable.tableName,
        DYNAMODB_TABLE_ANALYTICS: analyticsTable.tableName,
        DYNAMODB_TABLE_DISCUSSIONS: discussionsTable.tableName,
        // Legacy: Keep for backward compatibility during migration
        DYNAMODB_TABLE_NAME: coreTable.tableName,
        // Cognito environment variables (non-secret)
        COGNITO_USER_POOL_ID: userPool.userPoolId,
        COGNITO_CLIENT_ID: appClient.userPoolClientId,
        COGNITO_ISSUER: `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}`,
        NEXTAUTH_URL: 'https://www.myyoga.guru',
        // SES email configuration
        SES_FROM_EMAIL: 'hi@myyoga.guru',
        SES_CONFIG_SET: sesConfigSet.configurationSetName,
      },
      secrets: {
        // Load secrets from Secrets Manager
        MONGODB_URI: ecs.Secret.fromSecretsManager(appSecret, 'MONGODB_URI'),
        NEXTAUTH_SECRET: ecs.Secret.fromSecretsManager(appSecret, 'NEXTAUTH_SECRET'),
        EXPERT_SIGNUP_CODE: ecs.Secret.fromSecretsManager(appSecret, 'EXPERT_SIGNUP_CODE'),
        COGNITO_CLIENT_SECRET: ecs.Secret.fromSecretsManager(appSecret, 'COGNITO_CLIENT_SECRET'),
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

    // Port mapping: container port 3000 (ALB routes traffic here)
    container.addPortMappings({
      containerPort: 3000,
      hostPort: 0, // Dynamic port mapping - ALB handles routing
      protocol: ecs.Protocol.TCP,
    });

    // ========================================
    // ECS Service
    // ========================================
    const service = new ecs.Ec2Service(this, 'YogaGoService', {
      cluster,
      serviceName: 'yoga-go-service',
      taskDefinition,
      desiredCount: 1,
      capacityProviderStrategies: [
        {
          capacityProvider: capacityProvider.capacityProviderName,
          weight: 1,
        },
      ],
      minHealthyPercent: 0, // Allow taking down the only instance during updates
      maxHealthyPercent: 100, // Don't launch extra instances (single instance constraint)
      healthCheckGracePeriod: cdk.Duration.seconds(120), // Give more time for ALB health checks
    });

    // Register ECS service with ALB target group
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

    new cdk.CfnOutput(this, 'RepositoryArn', {
      value: repository.repositoryArn,
      description: 'ECR repository ARN',
      exportName: 'YogaGoRepositoryArn',
    });

    new cdk.CfnOutput(this, 'ClusterName', {
      value: cluster.clusterName,
      description: 'ECS cluster name',
      exportName: 'YogaGoClusterName',
    });

    new cdk.CfnOutput(this, 'ServiceName', {
      value: service.serviceName,
      description: 'ECS service name',
      exportName: 'YogaGoServiceName',
    });

    new cdk.CfnOutput(this, 'SecretArn', {
      value: appSecret.secretArn,
      description: 'Secrets Manager secret ARN',
      exportName: 'YogaGoSecretArn',
    });

    new cdk.CfnOutput(this, 'LogGroupName', {
      value: logGroup.logGroupName,
      description: 'CloudWatch log group name',
      exportName: 'YogaGoLogGroupName',
    });

    // Note: To get the EC2 instance public IP, use AWS CLI:
    // aws ec2 describe-instances --filters "Name=tag:aws:autoscaling:groupName,Values=<asg-name>" --query "Reservations[*].Instances[*].PublicIpAddress"
    new cdk.CfnOutput(this, 'GetPublicIpCommand', {
      value: `aws ec2 describe-instances --filters "Name=tag:aws:autoscaling:groupName,Values=${autoScalingGroup.autoScalingGroupName}" --query "Reservations[*].Instances[*].PublicIpAddress" --output text`,
      description: 'Command to get EC2 instance public IP',
    });

    // ========================================
    // Cognito Outputs
    // ========================================
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

    new cdk.CfnOutput(this, 'CognitoIssuer', {
      value: `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}`,
      description: 'Cognito Issuer URL (for OIDC)',
      exportName: 'YogaGoCognitoIssuer',
    });

    // ========================================
    // ALB Outputs
    // ========================================
    new cdk.CfnOutput(this, 'AlbDnsName', {
      value: alb.loadBalancerDnsName,
      description: 'ALB DNS Name - point your domain CNAME here',
      exportName: 'YogaGoAlbDnsName',
    });

    new cdk.CfnOutput(this, 'AlbArn', {
      value: alb.loadBalancerArn,
      description: 'ALB ARN',
      exportName: 'YogaGoAlbArn',
    });

    new cdk.CfnOutput(this, 'CertificateArn', {
      value: certificate.certificateArn,
      description: 'ACM Certificate ARN',
      exportName: 'YogaGoCertificateArn',
    });

    // ========================================
    // Route 53 Outputs
    // ========================================
    new cdk.CfnOutput(this, 'HostedZoneId', {
      value: hostedZone.hostedZoneId,
      description: 'Route 53 Hosted Zone ID',
      exportName: 'YogaGoHostedZoneId',
    });

    new cdk.CfnOutput(this, 'NameServers', {
      value: cdk.Fn.join(', ', hostedZone.hostedZoneNameServers || []),
      description: 'Route 53 Name Servers - Update these in Namecheap',
      exportName: 'YogaGoNameServers',
    });

    // ========================================
    // SES Outputs
    // ========================================
    new cdk.CfnOutput(this, 'SesConfigSetName', {
      value: sesConfigSet.configurationSetName,
      description: 'SES Configuration Set Name for email tracking',
      exportName: 'YogaGoSesConfigSetName',
    });

    new cdk.CfnOutput(this, 'SesEmailIdentity', {
      value: emailIdentity.emailIdentityName,
      description: 'SES Email Identity (verified domain)',
      exportName: 'YogaGoSesEmailIdentity',
    });

    new cdk.CfnOutput(this, 'WelcomeEmailLambdaArn', {
      value: welcomeEmailLambda.functionArn,
      description: 'Welcome Email Lambda ARN (Cognito Post Confirmation trigger)',
      exportName: 'YogaGoWelcomeEmailLambdaArn',
    });

    new cdk.CfnOutput(this, 'WelcomeEmailTemplateName', {
      value: welcomeEmailTemplate.ref,
      description: 'SES Welcome Email Template Name',
      exportName: 'YogaGoWelcomeEmailTemplateName',
    });

    new cdk.CfnOutput(this, 'InvoiceEmailTemplateName', {
      value: invoiceEmailTemplate.ref,
      description: 'SES Invoice Email Template Name',
      exportName: 'YogaGoInvoiceEmailTemplateName',
    });

    // ========================================
    // DynamoDB Outputs (4-Table Design)
    // ========================================
    new cdk.CfnOutput(this, 'DynamoDBCoreTableName', {
      value: coreTable.tableName,
      description: 'DynamoDB Core Table Name',
      exportName: 'YogaGoDynamoDBCoreTableName',
    });

    new cdk.CfnOutput(this, 'DynamoDBCalendarTableName', {
      value: calendarTable.tableName,
      description: 'DynamoDB Calendar Table Name',
      exportName: 'YogaGoDynamoDBCalendarTableName',
    });

    new cdk.CfnOutput(this, 'DynamoDBOrdersTableName', {
      value: ordersTable.tableName,
      description: 'DynamoDB Orders Table Name',
      exportName: 'YogaGoDynamoDBOrdersTableName',
    });

    new cdk.CfnOutput(this, 'DynamoDBAnalyticsTableName', {
      value: analyticsTable.tableName,
      description: 'DynamoDB Analytics Table Name',
      exportName: 'YogaGoDynamoDBAnalyticsTableName',
    });

    new cdk.CfnOutput(this, 'DynamoDBDiscussionsTableName', {
      value: discussionsTable.tableName,
      description: 'DynamoDB Discussions Table Name',
      exportName: 'YogaGoDynamoDBDiscussionsTableName',
    });
  }
}
