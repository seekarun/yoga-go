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
    // Cognito App Client (Email/Password + Google)
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
        ],
        logoutUrls: ['http://localhost:3111', 'https://myyoga.guru', 'https://www.myyoga.guru'],
      },
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.COGNITO,
        cognito.UserPoolClientIdentityProvider.GOOGLE,
      ],
      preventUserExistenceErrors: true,
    });

    // Ensure Google provider is created before the app client
    appClient.node.addDependency(googleProvider);

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

    // Add any application-specific permissions here
    // (e.g., S3 access, DynamoDB, etc.)

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
        // AWS region (required for Cognito SDK)
        AWS_REGION: this.region,
        // Cognito environment variables (non-secret)
        COGNITO_USER_POOL_ID: userPool.userPoolId,
        COGNITO_CLIENT_ID: appClient.userPoolClientId,
        COGNITO_ISSUER: `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}`,
        NEXTAUTH_URL: 'https://www.myyoga.guru',
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
  }
}
