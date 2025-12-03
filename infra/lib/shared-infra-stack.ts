import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import type { Construct } from 'constructs';

/**
 * App domain configuration for the shared ALB.
 * Add new apps here when onboarding.
 */
export interface AppDomainConfig {
  /** Primary domain (e.g., 'myyoga.guru') */
  domain: string;
  /** Additional domains (e.g., ['*.myyoga.guru']) */
  alternativeDomains?: string[];
}

export interface SharedInfraStackProps extends cdk.StackProps {
  /**
   * List of app domains to create certificates for.
   * Each app's domain gets an ACM certificate attached to the HTTPS listener.
   *
   * Example:
   * ```
   * appDomains: [
   *   { domain: 'myyoga.guru', alternativeDomains: ['*.myyoga.guru'] },
   *   { domain: 'app-two.com', alternativeDomains: ['*.app-two.com'] },
   * ]
   * ```
   */
  appDomains: AppDomainConfig[];
}

/**
 * Shared Infrastructure Stack
 *
 * Contains resources shared across all applications:
 * - VPC (default VPC lookup)
 * - ALB with HTTPS listener (all app certificates)
 * - ECS Cluster with EC2 capacity (single t3.micro for free tier)
 * - Security Groups
 *
 * Each app stack imports these resources and creates:
 * - ECR Repository
 * - ECS Service + Task Definition
 * - Target Group
 * - ALB Listener Rule (host-based routing)
 * - App-specific resources (Cognito, DynamoDB, etc.)
 *
 * ## Adding a New App
 *
 * 1. Add domain to `appDomains` in bin/app.ts:
 *    ```
 *    appDomains: [
 *      { domain: 'myyoga.guru', alternativeDomains: ['*.myyoga.guru'] },
 *      { domain: 'newapp.com', alternativeDomains: ['*.newapp.com'] },  // Add this
 *    ]
 *    ```
 *
 * 2. Create the app stack (copy app-two-stack.ts as template)
 *
 * 3. Add the stack to bin/app.ts with dependency on SharedInfraStack
 *
 * 4. Deploy: `cdk deploy SharedInfraStack` then `cdk deploy NewAppStack`
 */
export class SharedInfraStack extends cdk.Stack {
  // Exported resources for app stacks to use
  public readonly vpc: ec2.IVpc;
  public readonly albSecurityGroup: ec2.SecurityGroup;
  public readonly ecsSecurityGroup: ec2.SecurityGroup;
  public readonly cluster: ecs.Cluster;
  public readonly capacityProvider: ecs.AsgCapacityProvider;
  public readonly alb: elbv2.ApplicationLoadBalancer;
  public readonly httpsListener: elbv2.ApplicationListener;
  public readonly hostedZones: Map<string, route53.IHostedZone> = new Map();

  constructor(scope: Construct, id: string, props: SharedInfraStackProps) {
    super(scope, id, props);

    // ========================================
    // VPC - Use Default VPC (Free Tier Optimized)
    // ========================================
    this.vpc = ec2.Vpc.fromLookup(this, 'DefaultVPC', {
      isDefault: true,
    });

    // ========================================
    // Security Group for ALB
    // ========================================
    this.albSecurityGroup = new ec2.SecurityGroup(this, 'AlbSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for shared Application Load Balancer',
      allowAllOutbound: true,
    });

    this.albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow HTTP traffic from anywhere'
    );

    this.albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allow HTTPS traffic from anywhere'
    );

    // ========================================
    // Security Group for ECS Tasks
    // ========================================
    this.ecsSecurityGroup = new ec2.SecurityGroup(this, 'EcsSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for ECS tasks',
      allowAllOutbound: true,
    });

    this.ecsSecurityGroup.addIngressRule(
      this.albSecurityGroup,
      ec2.Port.tcpRange(32768, 65535),
      'Allow traffic from ALB on dynamic ports'
    );

    this.ecsSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22),
      'Allow SSH for debugging'
    );

    // ========================================
    // ECS Cluster
    // ========================================
    this.cluster = new ecs.Cluster(this, 'SharedCluster', {
      clusterName: 'shared-cluster',
      vpc: this.vpc,
      containerInsights: false,
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
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
      ],
    });

    // ========================================
    // Auto Scaling Group with ECS-Optimized AMI
    // ========================================
    const autoScalingGroup = new autoscaling.AutoScalingGroup(
      this,
      'EcsAutoScalingGroup',
      {
        vpc: this.vpc,
        vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
        instanceType: ec2.InstanceType.of(
          ec2.InstanceClass.T3,
          ec2.InstanceSize.MICRO
        ),
        machineImage: ecs.EcsOptimizedImage.amazonLinux2(),
        role: instanceRole,
        minCapacity: 1,
        maxCapacity: 1,
        desiredCapacity: 1,
        securityGroup: this.ecsSecurityGroup,
        associatePublicIpAddress: true,
        newInstancesProtectedFromScaleIn: false,
      }
    );

    // ========================================
    // ECS Capacity Provider
    // ========================================
    this.capacityProvider = new ecs.AsgCapacityProvider(
      this,
      'EcsCapacityProvider',
      {
        autoScalingGroup,
        enableManagedTerminationProtection: false,
      }
    );

    this.cluster.addAsgCapacityProvider(this.capacityProvider);

    // ========================================
    // Application Load Balancer
    // ========================================
    this.alb = new elbv2.ApplicationLoadBalancer(this, 'SharedALB', {
      vpc: this.vpc,
      internetFacing: true,
      securityGroup: this.albSecurityGroup,
      loadBalancerName: 'shared-alb',
    });

    // ========================================
    // Route53 Hosted Zones for all apps
    // ========================================
    // Creating hosted zones here enables automatic ACM DNS validation
    props.appDomains.forEach((appDomain, index) => {
      const hostedZone = new route53.HostedZone(this, `HostedZone${index}`, {
        zoneName: appDomain.domain,
        comment: `Hosted zone for ${appDomain.domain} - managed by CDK`,
      });

      this.hostedZones.set(appDomain.domain, hostedZone);

      // Output hosted zone ID for reference
      new cdk.CfnOutput(this, `HostedZoneId${index}`, {
        value: hostedZone.hostedZoneId,
        description: `Route53 Hosted Zone ID for ${appDomain.domain}`,
        exportName: `SharedHostedZoneId-${appDomain.domain.replace(/\./g, '-')}`,
      });

      new cdk.CfnOutput(this, `NameServers${index}`, {
        value: cdk.Fn.join(', ', hostedZone.hostedZoneNameServers || []),
        description: `Nameservers for ${appDomain.domain} - update at your registrar`,
      });
    });

    // ========================================
    // ACM Certificates for all apps
    // ========================================
    const certificates: acm.ICertificate[] = [];

    props.appDomains.forEach((appDomain, index) => {
      const hostedZone = this.hostedZones.get(appDomain.domain);

      const cert = new acm.Certificate(this, `Certificate${index}`, {
        domainName: appDomain.domain,
        subjectAlternativeNames: appDomain.alternativeDomains,
        validation: acm.CertificateValidation.fromDns(hostedZone),
      });
      certificates.push(cert);

      // Output certificate ARN for reference
      new cdk.CfnOutput(this, `CertificateArn${index}`, {
        value: cert.certificateArn,
        description: `ACM Certificate ARN for ${appDomain.domain}`,
        exportName: `SharedCertificateArn-${appDomain.domain.replace(/\./g, '-')}`,
      });
    });

    // ========================================
    // HTTPS Listener (port 443)
    // ========================================
    // Default action returns 404 - each app adds its own listener rules
    this.httpsListener = this.alb.addListener('HttpsListener', {
      port: 443,
      certificates: certificates,
      defaultAction: elbv2.ListenerAction.fixedResponse(404, {
        contentType: 'text/plain',
        messageBody: 'Not Found - No matching app for this domain',
      }),
    });

    // ========================================
    // HTTP Listener (port 80) - Redirect to HTTPS
    // ========================================
    this.alb.addListener('HttpListener', {
      port: 80,
      defaultAction: elbv2.ListenerAction.redirect({
        protocol: 'HTTPS',
        port: '443',
        permanent: true,
      }),
    });

    // ========================================
    // CloudFormation Outputs
    // ========================================
    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'VPC ID',
      exportName: 'SharedVpcId',
    });

    new cdk.CfnOutput(this, 'AlbDnsName', {
      value: this.alb.loadBalancerDnsName,
      description: 'ALB DNS Name - point your domains here',
      exportName: 'SharedAlbDnsName',
    });

    new cdk.CfnOutput(this, 'AlbArn', {
      value: this.alb.loadBalancerArn,
      description: 'ALB ARN',
      exportName: 'SharedAlbArn',
    });

    new cdk.CfnOutput(this, 'AlbCanonicalHostedZoneId', {
      value: this.alb.loadBalancerCanonicalHostedZoneId,
      description: 'ALB Canonical Hosted Zone ID (for Route53 alias records)',
      exportName: 'SharedAlbHostedZoneId',
    });

    new cdk.CfnOutput(this, 'HttpsListenerArn', {
      value: this.httpsListener.listenerArn,
      description: 'HTTPS Listener ARN',
      exportName: 'SharedHttpsListenerArn',
    });

    new cdk.CfnOutput(this, 'AlbSecurityGroupId', {
      value: this.albSecurityGroup.securityGroupId,
      description: 'ALB Security Group ID',
      exportName: 'SharedAlbSecurityGroupId',
    });

    new cdk.CfnOutput(this, 'EcsSecurityGroupId', {
      value: this.ecsSecurityGroup.securityGroupId,
      description: 'ECS Security Group ID',
      exportName: 'SharedEcsSecurityGroupId',
    });

    new cdk.CfnOutput(this, 'ClusterName', {
      value: this.cluster.clusterName,
      description: 'ECS Cluster Name',
      exportName: 'SharedClusterName',
    });

    new cdk.CfnOutput(this, 'ClusterArn', {
      value: this.cluster.clusterArn,
      description: 'ECS Cluster ARN',
      exportName: 'SharedClusterArn',
    });

    new cdk.CfnOutput(this, 'CapacityProviderName', {
      value: this.capacityProvider.capacityProviderName,
      description: 'ECS Capacity Provider Name',
      exportName: 'SharedCapacityProviderName',
    });

    new cdk.CfnOutput(this, 'GetPublicIpCommand', {
      value: `aws ec2 describe-instances --filters "Name=tag:aws:autoscaling:groupName,Values=${autoScalingGroup.autoScalingGroupName}" --query "Reservations[*].Instances[*].PublicIpAddress" --output text`,
      description: 'Command to get EC2 instance public IP',
    });
  }
}
