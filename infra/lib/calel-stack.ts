import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import type { Construct } from 'constructs';

/**
 * Calel Application Stack
 *
 * Standalone calendar & scheduling service infrastructure.
 * Contains:
 * - DynamoDB Table (calel-core) with single-table design
 * - SQS Queues for notifications and webhooks
 * - IAM User for Vercel deployment
 *
 * Key Patterns (calel-core table):
 * - Tenant: PK=TENANT, SK={tenantId}
 * - Host: PK=HOST#{tenantId}, SK={hostId}
 * - Availability: PK=AVAIL#{hostId}, SK={scheduleId}
 * - DateOverride: PK=OVERRIDE#{hostId}, SK={date}
 * - EventType: PK=EVENTTYPE#{hostId}, SK={eventTypeId}
 * - Booking: PK=BOOKING#HOST#{hostId}, SK={startTime}#{bookingId}
 * - Webhook: PK=WEBHOOK#{tenantId}, SK={webhookId}
 *
 * GSIs:
 * - GSI1: Inverted lookups (API key→tenant, email→host)
 * - GSI2: Time-based queries (bookings by date)
 */
export class CalelStack extends cdk.Stack {
  public readonly coreTable: dynamodb.Table;
  public readonly notificationQueue: sqs.Queue;
  public readonly webhookQueue: sqs.Queue;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ========================================
    // DynamoDB Core Table (Single-Table Design)
    // ========================================
    this.coreTable = new dynamodb.Table(this, 'CoreTable', {
      tableName: 'calel-core',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: false,
    });

    // GSI1: Inverted lookups
    // - API Key → Tenant: GSI1PK=APIKEY#{prefix}
    // - Email → Host: GSI1PK=HOST#EMAIL#{email}
    // - External User → Host: GSI1PK=HOST#EXTERNAL#{externalUserId}
    // - Slug → Tenant: GSI1PK=TENANT#SLUG#{slug}
    // - Slug → Host: GSI1PK=HOST#SLUG#{tenantSlug}#{hostSlug}
    this.coreTable.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI2: Time-based queries
    // - Tenant bookings by date: GSI2PK=BOOKING#TENANT#{tenantId}, GSI2SK={startTime}
    // - Event type by slug: GSI2PK=EVENTTYPE#SLUG#{hostSlug}#{slug}
    // - Event types by tenant: GSI2PK=EVENTTYPE#TENANT#{tenantId}, GSI2SK={eventTypeId}
    this.coreTable.addGlobalSecondaryIndex({
      indexName: 'GSI2',
      partitionKey: { name: 'GSI2PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI2SK', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ========================================
    // SQS Queues for Async Processing
    // ========================================

    // Dead Letter Queue for failed notifications
    const notificationDlq = new sqs.Queue(this, 'NotificationDLQ', {
      queueName: 'calel-notification-dlq',
      retentionPeriod: cdk.Duration.days(14),
    });

    // Main notification queue (confirmations, reminders, etc.)
    this.notificationQueue = new sqs.Queue(this, 'NotificationQueue', {
      queueName: 'calel-notifications',
      visibilityTimeout: cdk.Duration.seconds(60),
      retentionPeriod: cdk.Duration.days(4),
      deadLetterQueue: {
        queue: notificationDlq,
        maxReceiveCount: 3,
      },
    });

    // Dead Letter Queue for failed webhooks
    const webhookDlq = new sqs.Queue(this, 'WebhookDLQ', {
      queueName: 'calel-webhook-dlq',
      retentionPeriod: cdk.Duration.days(14),
    });

    // Webhook dispatch queue
    this.webhookQueue = new sqs.Queue(this, 'WebhookQueue', {
      queueName: 'calel-webhooks',
      visibilityTimeout: cdk.Duration.seconds(30),
      retentionPeriod: cdk.Duration.days(4),
      deadLetterQueue: {
        queue: webhookDlq,
        maxReceiveCount: 5,
      },
    });

    // ========================================
    // IAM User for Vercel Deployment
    // ========================================
    const vercelUser = new iam.User(this, 'VercelUser', {
      userName: 'calel-vercel',
    });

    // DynamoDB access policy
    const dynamoDbPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:GetItem',
        'dynamodb:PutItem',
        'dynamodb:UpdateItem',
        'dynamodb:DeleteItem',
        'dynamodb:Query',
        'dynamodb:Scan',
        'dynamodb:BatchGetItem',
        'dynamodb:BatchWriteItem',
      ],
      resources: [this.coreTable.tableArn, `${this.coreTable.tableArn}/index/*`],
    });

    // SQS access policy
    const sqsPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['sqs:SendMessage', 'sqs:GetQueueAttributes'],
      resources: [this.notificationQueue.queueArn, this.webhookQueue.queueArn],
    });

    // Create managed policy and attach to user
    const vercelPolicy = new iam.ManagedPolicy(this, 'VercelPolicy', {
      managedPolicyName: 'calel-vercel-policy',
      statements: [dynamoDbPolicy, sqsPolicy],
    });

    vercelUser.addManagedPolicy(vercelPolicy);

    // ========================================
    // Outputs
    // ========================================
    new cdk.CfnOutput(this, 'CoreTableName', {
      value: this.coreTable.tableName,
      description: 'Calel Core DynamoDB Table Name',
      exportName: 'CalelCoreTableName',
    });

    new cdk.CfnOutput(this, 'CoreTableArn', {
      value: this.coreTable.tableArn,
      description: 'Calel Core DynamoDB Table ARN',
      exportName: 'CalelCoreTableArn',
    });

    new cdk.CfnOutput(this, 'NotificationQueueUrl', {
      value: this.notificationQueue.queueUrl,
      description: 'Calel Notification Queue URL',
      exportName: 'CalelNotificationQueueUrl',
    });

    new cdk.CfnOutput(this, 'WebhookQueueUrl', {
      value: this.webhookQueue.queueUrl,
      description: 'Calel Webhook Queue URL',
      exportName: 'CalelWebhookQueueUrl',
    });

    new cdk.CfnOutput(this, 'VercelUserArn', {
      value: vercelUser.userArn,
      description: 'IAM User ARN for Vercel - create access keys in AWS Console',
      exportName: 'CalelVercelUserArn',
    });
  }
}
