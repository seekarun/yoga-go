import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import type { Construct } from 'constructs';
import type { SharedInfraStack } from './shared-infra-stack';

export interface AppTwoStackProps extends cdk.StackProps {
  /** Reference to the shared infrastructure stack */
  sharedInfra: SharedInfraStack;
  /** Listener rule priority (must be unique across all apps) */
  listenerRulePriority?: number;
  /** Host headers for routing (e.g., ['app-two.com', 'www.app-two.com']) */
  hostHeaders: string[];
}

/**
 * App Two Application Stack
 *
 * Minimal stack for the app-two placeholder application.
 * Uses shared infrastructure from SharedInfraStack.
 *
 * Contains:
 * - ECR Repository
 * - ECS Service + Task Definition
 * - Target Group + Listener Rule
 * - CloudWatch Log Group
 *
 * Add more resources (Cognito, DynamoDB, etc.) as needed for your app.
 */
export class AppTwoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AppTwoStackProps) {
    super(scope, id, props);

    const { sharedInfra, listenerRulePriority = 20, hostHeaders } = props;

    // ========================================
    // ECR Repository for Docker images
    // ========================================
    const repository = new ecr.Repository(this, 'AppTwoRepository', {
      repositoryName: 'app-two',
      imageScanOnPush: true,
      imageTagMutability: ecr.TagMutability.MUTABLE,
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
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // ========================================
    // CloudWatch Log Group
    // ========================================
    const logGroup = new logs.LogGroup(this, 'EcsLogGroup', {
      logGroupName: '/ecs/app-two',
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
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

    const taskRole = new iam.Role(this, 'EcsTaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: 'Role used by the App Two application',
    });

    // ========================================
    // ALB Target Group
    // ========================================
    const targetGroup = new elbv2.ApplicationTargetGroup(
      this,
      'AppTwoTargetGroup',
      {
        vpc: sharedInfra.vpc,
        port: 3001,
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
      }
    );

    // ========================================
    // ALB Listener Rule (Host-based routing)
    // ========================================
    new elbv2.ApplicationListenerRule(this, 'AppTwoListenerRule', {
      listener: sharedInfra.httpsListener,
      priority: listenerRulePriority,
      conditions: [elbv2.ListenerCondition.hostHeaders(hostHeaders)],
      action: elbv2.ListenerAction.forward([targetGroup]),
    });

    // ========================================
    // ECS Task Definition
    // ========================================
    const taskDefinition = new ecs.Ec2TaskDefinition(this, 'AppTwoTaskDef', {
      family: 'app-two',
      executionRole: taskExecutionRole,
      taskRole,
      networkMode: ecs.NetworkMode.BRIDGE,
    });

    const container = taskDefinition.addContainer('app-two-container', {
      image: ecs.ContainerImage.fromEcrRepository(repository, 'latest'),
      memoryLimitMiB: 256,
      cpu: 128,
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'app-two',
        logGroup,
      }),
      environment: {
        NODE_ENV: 'production',
        PORT: '3001',
      },
      healthCheck: {
        command: [
          'CMD-SHELL',
          "node -e \"require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})\"",
        ],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
        startPeriod: cdk.Duration.seconds(60),
      },
    });

    container.addPortMappings({
      containerPort: 3001,
      hostPort: 0,
      protocol: ecs.Protocol.TCP,
    });

    // ========================================
    // ECS Service (using shared cluster)
    // ========================================
    const service = new ecs.Ec2Service(this, 'AppTwoService', {
      cluster: sharedInfra.cluster,
      serviceName: 'app-two-service',
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
      exportName: 'AppTwoRepositoryUri',
    });

    new cdk.CfnOutput(this, 'RepositoryName', {
      value: repository.repositoryName,
      description: 'ECR repository name',
      exportName: 'AppTwoRepositoryName',
    });

    new cdk.CfnOutput(this, 'ServiceName', {
      value: service.serviceName,
      description: 'ECS service name',
      exportName: 'AppTwoServiceName',
    });

    new cdk.CfnOutput(this, 'LogGroupName', {
      value: logGroup.logGroupName,
      description: 'CloudWatch log group name',
      exportName: 'AppTwoLogGroupName',
    });

    new cdk.CfnOutput(this, 'HostHeaders', {
      value: hostHeaders.join(', '),
      description: 'Host headers for ALB routing',
      exportName: 'AppTwoHostHeaders',
    });
  }
}
