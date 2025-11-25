import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cognito from 'aws-cdk-lib/aws-cognito';
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
    // Security Group for ECS Tasks
    // ========================================
    const ecsSecurityGroup = new ec2.SecurityGroup(this, 'EcsSecurityGroup', {
      vpc,
      description: 'Security group for Yoga Go ECS tasks',
      allowAllOutbound: true, // Required for ECR, MongoDB Atlas, Auth0, etc.
    });

    // Allow HTTP traffic (port 80) from anywhere
    ecsSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow HTTP traffic from anywhere'
    );

    // Allow HTTPS traffic (port 443) from anywhere
    ecsSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allow HTTPS traffic from anywhere'
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
    // Cognito App Client (Email/Password only)
    // ========================================
    // Note: Social providers (Google, Facebook) can be added later by:
    // 1. Creating OAuth credentials in respective developer consoles
    // 2. Adding UserPoolIdentityProviderGoogle/Facebook resources
    // 3. Updating supportedIdentityProviders to include them
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
        ],
        logoutUrls: ['http://localhost:3111', 'https://myyoga.guru', 'https://www.myyoga.guru'],
      },
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.COGNITO, // Email/password only
      ],
      preventUserExistenceErrors: true,
    });

    // ========================================
    // Secrets Manager Secret (for environment variables)
    // ========================================
    // Import existing secret - CDK will NOT overwrite its values
    // Create the secret manually in AWS Console with these keys:
    // - MONGODB_URI
    // - NEXTAUTH_SECRET
    // - EXPERT_SIGNUP_CODE
    // - COGNITO_CLIENT_SECRET (optional, for Cognito)
    const appSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      'AppSecret',
      'yoga-go/production'
    );

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
        // Cognito environment variables (non-secret)
        COGNITO_USER_POOL_ID: userPool.userPoolId,
        COGNITO_CLIENT_ID: appClient.userPoolClientId,
        COGNITO_ISSUER: `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}`,
        NEXTAUTH_URL: 'https://myyoga.guru',
      },
      secrets: {
        // Load secrets from Secrets Manager
        MONGODB_URI: ecs.Secret.fromSecretsManager(appSecret, 'MONGODB_URI'),
        NEXTAUTH_SECRET: ecs.Secret.fromSecretsManager(appSecret, 'NEXTAUTH_SECRET'),
        EXPERT_SIGNUP_CODE: ecs.Secret.fromSecretsManager(appSecret, 'EXPERT_SIGNUP_CODE'),
        // Note: Cognito client secret is retrieved at runtime from Cognito
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

    // Port mapping: map host port 80 to container port 3000
    container.addPortMappings({
      containerPort: 3000,
      hostPort: 80, // Map to standard HTTP port
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
      healthCheckGracePeriod: cdk.Duration.seconds(60),
    });

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
  }
}
