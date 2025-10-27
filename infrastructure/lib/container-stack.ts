import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import type * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import type { Construct } from 'constructs';
import type { InfraConfig } from './config';

interface ContainerStackProps extends cdk.StackProps {
  config: InfraConfig;
  vpc: ec2.Vpc;
  targetGroup?: elbv2.ApplicationTargetGroup;
}

/**
 * Container Stack - ECS with EC2, ECR, Task Definitions
 *
 * Creates:
 * - ECR Repository for Docker images
 * - ECS Cluster with EC2 capacity
 * - Auto Scaling Group with t3.micro instances (free tier)
 * - ECS Task Definition for EC2
 * - ECS service with EC2 launch type
 * - CloudWatch Log Groups
 * - IAM Roles and Policies
 * - Secrets Manager for environment variables
 *
 * Free Tier Considerations:
 * - EC2 t3.micro: 750 hours/month for 12 months (free tier)
 * - ECR: 500MB storage free for 12 months
 * - CloudWatch Logs: 5GB ingestion free
 * - Data transfer: 100GB/month free
 */
export class ContainerStack extends cdk.Stack {
  public readonly ecsService: ecs.Ec2Service;
  public readonly ecrRepository: ecr.Repository;
  public readonly cluster: ecs.Cluster;
  public readonly autoScalingGroup: autoscaling.AutoScalingGroup;

  constructor(scope: Construct, id: string, props: ContainerStackProps) {
    super(scope, id, props);

    const { config, vpc, targetGroup } = props;

    console.log('[DBG][container-stack] Creating ECS infrastructure with EC2');

    // Import existing ECR Repository (created in previous deployment with RETAIN policy)
    this.ecrRepository = ecr.Repository.fromRepositoryName(
      this,
      'YogaGoEcrRepository',
      config.appName
    ) as ecr.Repository;
    console.log('[DBG][container-stack] Using existing ECR repository');

    // Create ECS Cluster
    this.cluster = new ecs.Cluster(this, 'YogaGoEcsCluster', {
      clusterName: `${config.appName}-cluster`,
      vpc: vpc,
      containerInsights: false, // Disable to save costs (not free tier)
    });

    // Create CloudWatch Log Group for container logs
    const logGroup = new logs.LogGroup(this, 'YogaGoLogGroup', {
      logGroupName: `/ecs/${config.appName}`,
      retention: logs.RetentionDays.ONE_WEEK, // Reduce retention to save costs
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Import existing Secrets Manager secret for environment variables
    // Note: Secrets Manager costs $0.40/secret/month (not free tier)
    // Secret must be created manually before deploying this stack
    // Use scripts/deployment/create-secrets.sh to create it
    const appSecrets = secretsmanager.Secret.fromSecretNameV2(
      this,
      'YogaGoAppSecrets',
      `${config.appName}/app-secrets`
    );
    console.log('[DBG][container-stack] Using existing Secrets Manager secret');

    // Create Task Execution Role (for pulling images and writing logs)
    const taskExecutionRole = new iam.Role(this, 'TaskExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
      ],
    });

    // Allow task to read secrets
    appSecrets.grantRead(taskExecutionRole);

    // Create Task Role (for the application running in the container)
    const taskRole = new iam.Role(this, 'TaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    // Create Security Group for EC2 instances
    const instanceSG = new ec2.SecurityGroup(this, 'YogaGoInstanceSecurityGroup', {
      vpc: vpc,
      description: 'Security group for Yoga-GO ECS EC2 instances',
      allowAllOutbound: true,
    });

    // Allow inbound traffic on ephemeral port range for dynamic port mapping
    // Dynamic port mapping uses ports in the range 32768-65535
    instanceSG.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcpRange(32768, 65535),
      'Allow HTTP traffic from ALB on ephemeral ports for dynamic port mapping'
    );

    // Create Auto Scaling Group with ECS-optimized AMI
    this.autoScalingGroup = new autoscaling.AutoScalingGroup(this, 'YogaGoAutoScalingGroup', {
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.SMALL), // Free tier - 2GB RAM
      machineImage: ecs.EcsOptimizedImage.amazonLinux2(),
      minCapacity: 1,
      maxCapacity: 1, // Keep at 1 for free tier
      desiredCapacity: 1,
      securityGroup: instanceSG,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC, // Use public subnets to avoid NAT Gateway costs
      },
      associatePublicIpAddress: true,
    });

    // Add capacity to cluster
    const capacityProvider = new ecs.AsgCapacityProvider(this, 'AsgCapacityProvider', {
      autoScalingGroup: this.autoScalingGroup,
      enableManagedTerminationProtection: false,
    });

    this.cluster.addAsgCapacityProvider(capacityProvider);

    // Create EC2 Task Definition
    const taskDefinition = new ecs.Ec2TaskDefinition(this, 'YogaGoTaskDefinition', {
      family: `${config.appName}-task`,
      networkMode: ecs.NetworkMode.BRIDGE, // Use bridge mode for EC2
      executionRole: taskExecutionRole,
      taskRole: taskRole,
    });

    // Add container to task definition
    const container = taskDefinition.addContainer('YogaGoContainer', {
      containerName: config.appName,
      image: ecs.ContainerImage.fromEcrRepository(this.ecrRepository, 'latest'),
      memoryReservationMiB: config.memory, // Soft limit
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: config.appName,
        logGroup: logGroup,
      }),
      environment: {
        NODE_ENV: 'production',
        PORT: config.containerPort.toString(),
        // Public environment variables
        AUTH0_BASE_URL: `https://${config.domains.primary}`,
        AUTH0_ISSUER_BASE_URL: process.env.AUTH0_ISSUER_BASE_URL || 'REPLACE_WITH_AUTH0_ISSUER_URL',
        AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID || 'REPLACE_WITH_AUTH0_CLIENT_ID',
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
          process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'REPLACE_WITH_STRIPE_PUBLISHABLE_KEY',
        NEXT_PUBLIC_RAZORPAY_KEY_ID:
          process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'REPLACE_WITH_RAZORPAY_KEY_ID',
        // Cloudflare configuration (map from .env naming)
        CLOUDFLARE_ACCOUNT_ID: process.env.CF_ACCOUNT_ID || 'REPLACE_WITH_CLOUDFLARE_ACCOUNT_ID',
        CLOUDFLARE_IMAGES_ACCOUNT_HASH: process.env.CF_SUBDOMAIN || 'REPLACE_WITH_CLOUDFLARE_HASH',
      },
      secrets: {
        // Secret environment variables from Secrets Manager
        MONGODB_URI: ecs.Secret.fromSecretsManager(appSecrets, 'MONGODB_URI'),
        AUTH0_SECRET: ecs.Secret.fromSecretsManager(appSecrets, 'AUTH0_SECRET'),
        AUTH0_CLIENT_SECRET: ecs.Secret.fromSecretsManager(appSecrets, 'AUTH0_CLIENT_SECRET'),
        CLOUDFLARE_API_TOKEN: ecs.Secret.fromSecretsManager(appSecrets, 'CLOUDFLARE_API_TOKEN'),
        STRIPE_SECRET_KEY: ecs.Secret.fromSecretsManager(appSecrets, 'STRIPE_SECRET_KEY'),
        RAZORPAY_KEY_SECRET: ecs.Secret.fromSecretsManager(appSecrets, 'RAZORPAY_KEY_SECRET'),
      },
      healthCheck: {
        command: ['CMD-SHELL', 'curl -f http://localhost:3000/api/health || exit 1'],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(10),
        retries: 3,
        startPeriod: cdk.Duration.seconds(60),
      },
    });

    // Add port mapping
    container.addPortMappings({
      containerPort: config.containerPort,
      hostPort: 0, // Dynamic port mapping for EC2
      protocol: ecs.Protocol.TCP,
    });

    // Create ECS Service with EC2 launch type
    this.ecsService = new ecs.Ec2Service(this, 'YogaGoEcsService', {
      serviceName: `${config.appName}-service`,
      cluster: this.cluster,
      taskDefinition: taskDefinition,
      desiredCount: config.desiredCount,
      capacityProviderStrategies: [
        {
          capacityProvider: capacityProvider.capacityProviderName,
          weight: 1,
        },
      ],
      healthCheckGracePeriod: cdk.Duration.seconds(120), // Increased grace period
      // Circuit breaker disabled to allow deployment even if containers fail initially
      // Enable it after secrets are updated and service is healthy
      circuitBreaker: {
        rollback: false, // Disable automatic rollback to allow debugging
      },
    });

    // Attach service to target group if provided
    if (targetGroup) {
      this.ecsService.attachToApplicationTargetGroup(targetGroup);
      console.log('[DBG][container-stack] Attached ECS service to target group');
    }

    // Outputs
    new cdk.CfnOutput(this, 'EcrRepositoryUri', {
      value: this.ecrRepository.repositoryUri,
      description: 'ECR Repository URI',
      exportName: `${config.appName}-ecr-uri`,
    });

    new cdk.CfnOutput(this, 'EcsClusterName', {
      value: this.cluster.clusterName,
      description: 'ECS Cluster Name',
      exportName: `${config.appName}-cluster-name`,
    });

    new cdk.CfnOutput(this, 'EcsServiceName', {
      value: this.ecsService.serviceName,
      description: 'ECS Service Name',
      exportName: `${config.appName}-service-name`,
    });

    new cdk.CfnOutput(this, 'SecretsManagerArn', {
      value: appSecrets.secretArn,
      description: 'Secrets Manager ARN',
      exportName: `${config.appName}-secrets-arn`,
    });

    new cdk.CfnOutput(this, 'AutoScalingGroupName', {
      value: this.autoScalingGroup.autoScalingGroupName,
      description: 'Auto Scaling Group Name',
    });
  }
}
