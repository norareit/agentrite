import * as cdk from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';

interface CertificateStackProps extends cdk.StackProps {
  /** Apex domain of the existing Route53 hosted zone, e.g. ritenoar.com */
  hostedZoneDomain: string;
  /** Fully qualified host the certificate covers, e.g. agent-kit.ritenoar.com */
  subdomain: string;
}

/** CloudFront only accepts a certificate from us-east-1, so this stack lives there and the hosting stack does not. */
export class CertificateStack extends cdk.Stack {
  public readonly certificate: acm.Certificate;

  constructor(scope: Construct, id: string, props: CertificateStackProps) {
    super(scope, id, props);

    const hostedZone = route53.HostedZone.fromLookup(this, 'Zone', {
      domainName: props.hostedZoneDomain,
    });

    this.certificate = new acm.Certificate(this, 'Certificate', {
      domainName: props.subdomain,
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });
  }
}
