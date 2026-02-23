import * as cdk from "aws-cdk-lib";
import * as cr from "aws-cdk-lib/custom-resources";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import type { Construct } from "constructs";

export interface EnsureSecretResult {
  /** The secret reference for use with secretValueFromJson() */
  secret: secretsmanager.ISecret;
  /**
   * The custom resource that creates the secret.
   * Any CFN construct that resolves secret values at deploy time
   * (e.g. Cognito identity providers, Lambda env vars using secretValueFromJson)
   * MUST add an explicit dependency on this resource:
   *
   *   myConstruct.node.addDependency(resource);
   *
   * This is necessary because fromSecretNameV2() returns an imported reference
   * that doesn't produce a CloudFormation resource, so node.addDependency on
   * the secret itself has no effect on CFN ordering.
   */
  resource: cr.AwsCustomResource;
}

/**
 * Ensures a Secrets Manager secret exists with the given keys.
 * If the secret already exists, it is left untouched (values are NOT overwritten).
 * If it does not exist, it is created with placeholder values.
 *
 * Returns { secret, resource }:
 * - secret: use for secretValueFromJson() and grantRead()
 * - resource: add as dependency to any construct that resolves secret values at deploy time
 */
export const ensureSecret = (
  scope: Construct,
  id: string,
  secretName: string,
  keys: string[],
): EnsureSecretResult => {
  const placeholder = Object.fromEntries(
    keys.map((key) => [key, "<REPLACE_THIS>"]),
  );

  const resource = new cr.AwsCustomResource(scope, `${id}EnsureExists`, {
    onCreate: {
      service: "SecretsManager",
      action: "createSecret",
      parameters: {
        Name: secretName,
        SecretString: JSON.stringify(placeholder),
        Description: `Auto-created by CDK with placeholder values. Update with real values: ${keys.join(", ")}`,
      },
      physicalResourceId: cr.PhysicalResourceId.of(secretName),
      ignoreErrorCodesMatching: "ResourceExistsException",
    },
    policy: cr.AwsCustomResourcePolicy.fromStatements([
      new cdk.aws_iam.PolicyStatement({
        actions: ["secretsmanager:CreateSecret"],
        resources: ["*"],
      }),
    ]),
  });

  const secret = secretsmanager.Secret.fromSecretNameV2(scope, id, secretName);

  return { secret, resource };
};
