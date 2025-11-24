import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import type { Construct } from 'constructs';

export class YogaGoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ECR Repository for Docker images
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

    // Outputs
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
  }
}
