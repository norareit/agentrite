import * as cdk from 'aws-cdk-lib';
import { CertificateStack } from '../lib/certificate-stack.ts';
import { HostingStack } from '../lib/hosting-stack.ts';

const app = new cdk.App();

const account = '887023619290';
const hostedZoneDomain = 'ritenoar.com';
const subdomain = 'agentrite.ritenoar.com';

const certificateStack = new CertificateStack(app, 'AgentRiteCertStack', {
  env: { account, region: 'us-east-1' },
  crossRegionReferences: true,
  hostedZoneDomain,
  subdomain,
});

new HostingStack(app, 'AgentRiteHostingStack', {
  env: { account, region: 'eu-west-1' },
  crossRegionReferences: true,
  hostedZoneDomain,
  subdomain,
  certificate: certificateStack.certificate,
});
