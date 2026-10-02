import * as cdk from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { recordNameFor } from './record-name.ts';

interface HostingStackProps extends cdk.StackProps {
  /** Apex domain of the existing Route53 hosted zone, e.g. ritenoar.com */
  hostedZoneDomain: string;
  /** Fully qualified host the kit is served on, e.g. agentrite.ritenoar.com */
  subdomain: string;
  certificate: acm.ICertificate;
}

/**
 * Serves the kit's release tarballs. The bucket holds nothing else, and deploy.sh is what fills it: a CDK
 * BucketDeployment would prune older tarballs that a consumer's lockfile still pins.
 */
export class HostingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: HostingStackProps) {
    super(scope, id, props);

    const recordName = recordNameFor(props.subdomain, props.hostedZoneDomain);

    const hostedZone = route53.HostedZone.fromLookup(this, 'Zone', {
      domainName: props.hostedZoneDomain,
    });

    // Private: the tarballs are readable through the distribution, with no credential, and not from the bucket.
    // Retained, because deleting the stack must not delete versions that consumers still install.
    const bucket = new s3.Bucket(this, 'ReleaseBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      domainNames: [props.subdomain],
      certificate: props.certificate,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
    });

    new route53.ARecord(this, 'AliasRecord', {
      zone: hostedZone,
      recordName,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
    });

    new cdk.CfnOutput(this, 'BucketName', {
      value: bucket.bucketName,
      description: 'Bucket deploy.sh uploads release tarballs to',
    });

    new cdk.CfnOutput(this, 'BaseUrl', { value: `https://${props.subdomain}` });
  }
}
