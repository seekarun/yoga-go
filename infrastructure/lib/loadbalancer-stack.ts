import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
// Uncomment when enabling HTTPS and Route53
// import * as acm from 'aws-cdk-lib/aws-certificatemanager';
// import * as route53 from 'aws-cdk-lib/aws-route53';
// import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';
import type { Construct } from 'constructs';
import type { InfraConfig } from './config';

interface LoadBalancerStackProps extends cdk.StackProps {
  config: InfraConfig;
  vpc: ec2.Vpc;
}

/**
 * Load Balancer Stack - Application Load Balancer with Domain-Based Routing
 *
 * Creates:
 * - Application Load Balancer (ALB)
 * - Target Groups for ECS service
 * - Listeners (HTTP and HTTPS)
 * - Host-based routing rules for multiple domains
 * - SSL/TLS certificates (ACM)
 * - Route 53 DNS records (optional)
 * - Security Groups
 *
 * Domain Routing:
 * - yogago.com → ECS service (default route /)
 * - kavithayoga.com → ECS service with custom header (Next.js middleware handles rewrite)
 *
 * Free Tier Considerations:
 * - ALB: 750 hours/month free for 12 months
 * - Data processing: 15 GB/month free
 * - ACM certificates: Free
 * - Route 53: $0.50/hosted zone/month (not free)
 */
export class LoadBalancerStack extends cdk.Stack {
  public readonly loadBalancer: elbv2.ApplicationLoadBalancer;
  public readonly httpListener: elbv2.ApplicationListener;
  public readonly httpsListener?: elbv2.ApplicationListener;
  public readonly targetGroup: elbv2.ApplicationTargetGroup;

  constructor(scope: Construct, id: string, props: LoadBalancerStackProps) {
    super(scope, id, props);

    const { config, vpc } = props;

    console.log('[DBG][loadbalancer-stack] Creating Application Load Balancer');

    // Create Security Group for ALB
    const albSG = new ec2.SecurityGroup(this, 'YogaGoAlbSecurityGroup', {
      vpc: vpc,
      description: 'Security group for Yoga-GO Application Load Balancer',
      allowAllOutbound: true,
    });

    // Allow HTTP traffic from anywhere
    albSG.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow HTTP traffic');

    // Allow HTTPS traffic from anywhere
    albSG.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow HTTPS traffic');

    // Create Application Load Balancer
    this.loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'YogaGoLoadBalancer', {
      vpc: vpc,
      internetFacing: true,
      loadBalancerName: `${config.appName}-alb`,
      securityGroup: albSG,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      deletionProtection: false, // Set to true for production
    });

    // Note: Security group rules for Fargate service are configured in ContainerStack
    // to avoid circular dependencies between stacks

    // Create Target Group for ECS service (without targets to avoid circular dependency)
    // Note: Using INSTANCE target type for EC2-based ECS with bridge networking
    this.targetGroup = new elbv2.ApplicationTargetGroup(this, 'YogaGoTargetGroup', {
      vpc: vpc,
      port: config.containerPort,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.INSTANCE, // Use INSTANCE for EC2 with bridge mode
      healthCheck: {
        path: '/api/health',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(10),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
        healthyHttpCodes: '200',
      },
      deregistrationDelay: cdk.Duration.seconds(30),
    });

    // Create HTTP Listener (port 80)
    this.httpListener = this.loadBalancer.addListener('HttpListener', {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      defaultAction: elbv2.ListenerAction.forward([this.targetGroup]),
    });

    // Note: SSL/TLS Certificate Setup
    // To enable HTTPS, you need to:
    // 1. Create or import a certificate in AWS Certificate Manager (ACM)
    // 2. Uncomment the code below and provide the certificate ARN
    // 3. Set up DNS records to point to the load balancer

    /*
    // Import existing certificate (recommended for production)
    const certificate = acm.Certificate.fromCertificateArn(
      this,
      'Certificate',
      'arn:aws:acm:REGION:ACCOUNT_ID:certificate/CERTIFICATE_ID'
    );

    // Or request a new certificate (requires DNS validation)
    // const certificate = new acm.Certificate(this, 'Certificate', {
    //   domainName: config.domains.primary,
    //   subjectAlternativeNames: [config.domains.expertKavitha],
    //   validation: acm.CertificateValidation.fromDns(),
    // });

    // Create HTTPS Listener (port 443)
    this.httpsListener = this.loadBalancer.addListener('HttpsListener', {
      port: 443,
      protocol: elbv2.ApplicationProtocol.HTTPS,
      certificates: [certificate],
      defaultAction: elbv2.ListenerAction.forward([targetGroup]),
    });

    // Redirect HTTP to HTTPS
    this.httpListener.addAction('RedirectToHttps', {
      action: elbv2.ListenerAction.redirect({
        protocol: 'HTTPS',
        port: '443',
        permanent: true,
      }),
    });

    // Add host-based routing rules for different domains
    // Rule 1: kavithayoga.com → forward to target group with custom header
    this.httpsListener.addAction('KavithaYogaRule', {
      priority: 10,
      conditions: [
        elbv2.ListenerCondition.hostHeaders([config.domains.expertKavitha]),
      ],
      action: elbv2.ListenerAction.forward([targetGroup]),
    });

    // Rule 2: yogago.com → default target group
    this.httpsListener.addAction('YogaGoRule', {
      priority: 20,
      conditions: [
        elbv2.ListenerCondition.hostHeaders([config.domains.primary]),
      ],
      action: elbv2.ListenerAction.forward([targetGroup]),
    });
    */

    // Note: Route 53 DNS Setup
    // To set up DNS records, uncomment the code below
    // You need to have a hosted zone in Route 53

    /*
    // Import existing hosted zone
    const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName: 'yogago.com',
    });

    // Create A record for primary domain
    new route53.ARecord(this, 'PrimaryDomainARecord', {
      zone: hostedZone,
      recordName: config.domains.primary,
      target: route53.RecordTarget.fromAlias(
        new route53Targets.LoadBalancerTarget(this.loadBalancer)
      ),
    });

    // Create A record for expert domain (if using same hosted zone)
    new route53.ARecord(this, 'ExpertDomainARecord', {
      zone: hostedZone,
      recordName: config.domains.expertKavitha,
      target: route53.RecordTarget.fromAlias(
        new route53Targets.LoadBalancerTarget(this.loadBalancer)
      ),
    });
    */

    // Outputs
    new cdk.CfnOutput(this, 'LoadBalancerDnsName', {
      value: this.loadBalancer.loadBalancerDnsName,
      description: 'Load Balancer DNS Name',
      exportName: `${config.appName}-alb-dns`,
    });

    new cdk.CfnOutput(this, 'LoadBalancerArn', {
      value: this.loadBalancer.loadBalancerArn,
      description: 'Load Balancer ARN',
    });

    new cdk.CfnOutput(this, 'TargetGroupArn', {
      value: this.targetGroup.targetGroupArn,
      description: 'Target Group ARN',
      exportName: `${config.appName}-target-group-arn`,
    });

    // Output instructions for DNS setup
    new cdk.CfnOutput(this, 'DnsSetupInstructions', {
      value: `Point your domains (${config.domains.primary}, ${config.domains.expertKavitha}) to ${this.loadBalancer.loadBalancerDnsName}`,
      description: 'DNS Setup Instructions',
    });
  }
}
