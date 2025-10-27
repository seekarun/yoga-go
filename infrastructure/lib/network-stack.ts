import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import type { Construct } from 'constructs';
import type { InfraConfig } from './config';

interface NetworkStackProps extends cdk.StackProps {
  config: InfraConfig;
}

/**
 * Network Stack - VPC, Subnets, and Network Infrastructure
 *
 * Creates:
 * - VPC with public and private subnets across 2 AZs
 * - Internet Gateway
 * - NAT Gateways (1 per AZ for high availability)
 * - Security Groups
 * - VPC Endpoints for AWS services (to reduce NAT costs)
 *
 * Free Tier Considerations:
 * - VPC and subnets are free
 * - NAT Gateway costs $0.045/hour (~$32/month) - NOT free tier
 * - Consider using public subnets only for development to save costs
 */
export class NetworkStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props: NetworkStackProps) {
    super(scope, id, props);

    const { config } = props;

    console.log('[DBG][network-stack] Creating VPC with CIDR:', config.vpcCidr);

    // Create VPC with public and private subnets
    this.vpc = new ec2.Vpc(this, 'YogaGoVpc', {
      vpcName: `${config.appName}-vpc`,
      ipAddresses: ec2.IpAddresses.cidr(config.vpcCidr),
      maxAzs: 2, // Use 2 Availability Zones for high availability
      natGateways: 1, // Use 1 NAT Gateway to reduce costs (not free tier)
      // For development/cost savings: set natGateways to 0 and use public subnets only
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
      ],
      enableDnsHostnames: true,
      enableDnsSupport: true,
    });

    // Add VPC Flow Logs (optional, for security monitoring)
    // Commented out to reduce costs - uncomment for production
    /*
    const logGroup = new logs.LogGroup(this, 'VpcFlowLogs', {
      logGroupName: `/aws/vpc/${config.appName}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    new ec2.FlowLog(this, 'FlowLog', {
      resourceType: ec2.FlowLogResourceType.fromVpc(this.vpc),
      destination: ec2.FlowLogDestination.toCloudWatchLogs(logGroup),
    });
    */

    // Add VPC Endpoints to reduce NAT Gateway costs
    // S3 Gateway Endpoint (free)
    this.vpc.addGatewayEndpoint('S3Endpoint', {
      service: ec2.GatewayVpcEndpointAwsService.S3,
    });

    // ECR API Endpoint (for pulling container images without NAT)
    this.vpc.addInterfaceEndpoint('EcrApiEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.ECR,
      privateDnsEnabled: true,
    });

    // ECR Docker Endpoint
    this.vpc.addInterfaceEndpoint('EcrDockerEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
      privateDnsEnabled: true,
    });

    // CloudWatch Logs Endpoint (for container logs)
    this.vpc.addInterfaceEndpoint('CloudWatchLogsEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
      privateDnsEnabled: true,
    });

    // Secrets Manager Endpoint (for environment variables)
    this.vpc.addInterfaceEndpoint('SecretsManagerEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
      privateDnsEnabled: true,
    });

    // Output VPC ID
    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'VPC ID',
      exportName: `${config.appName}-vpc-id`,
    });

    // Output VPC CIDR
    new cdk.CfnOutput(this, 'VpcCidr', {
      value: this.vpc.vpcCidrBlock,
      description: 'VPC CIDR Block',
    });

    // Tag VPC
    cdk.Tags.of(this.vpc).add('Name', `${config.appName}-vpc`);
  }
}
