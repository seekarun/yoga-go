/**
 * Configuration interface for infrastructure stacks
 */
export interface InfraConfig {
  appName: string;
  environment: string;
  vpcCidr: string;
  containerPort: number;
  cpu: number;
  memory: number;
  desiredCount: number;
  domains: {
    primary: string;
    expertKavitha: string;
    expertDeepak: string;
  };
}
