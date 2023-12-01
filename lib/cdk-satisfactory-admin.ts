import { Construct } from 'constructs'
import {
  Arn,
  Duration,
  Stack,
  StackProps,
  aws_apigateway as apigw,
  aws_certificatemanager as acm,
  aws_cloudfront as cloudfront,
  aws_cloudfront_origins,
  aws_cognito as cognito,
  aws_iam as iam,
  aws_lambda as lambda,
  aws_route53 as r53,
  aws_route53_targets,
  aws_s3 as s3,
  aws_s3_deployment,
  aws_logs as logs
} from 'aws-cdk-lib'

import { join } from 'path'

export interface CdkSatisfactoryAdminStackProps extends StackProps {
  workloadRegion: string
}

export class CdkSatisfactoryAdminStack extends Stack {
  constructor (scope: Construct, id: string, props: CdkSatisfactoryAdminStackProps) {
    super(scope, id, props)

    const userPool = new cognito.UserPool(this, 'UserPool', {
      selfSignUpEnabled: true
    })
    userPool.addClient('CognitoClient')

    const lambdaFunction = new lambda.Function(this, 'AdminFunction', {
      runtime: lambda.Runtime.PYTHON_3_10,
      code: lambda.Code.fromAsset(join(__dirname, '..', 'lambda')),
      handler: 'manage-server.handler',
      architecture: lambda.Architecture.ARM_64,
      timeout: Duration.minutes(2),
      environment: {
        WORKLOAD_REGION: props.workloadRegion
      }
    })
    lambdaFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'autoscaling:DescribeAutoScalingGroups',
        'autoscaling:SetDesiredCapacity',
        'autoscaling:StartInstanceRefresh',
        'ec2:DescribeInstances',
        'ec2:DescribeManagedPrefixLists',
        'ec2:DescribeSecurityGroups',
        'ec2:GetManagedPrefixListEntries',
        'ec2:ModifyManagedPrefixList',
        'ssm:GetCommandInvocation',
        'ssm:GetParameter'
      ],
      effect: iam.Effect.ALLOW,
      resources: ['*']
    }))
    lambdaFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'ssm:SendCommand',
        'ec2:StartInstances',
        'ec2:StopInstances'
      ],
      effect: iam.Effect.ALLOW,
      resources: [
        Arn.format({
          region: props.workloadRegion,
          account: '',
          service: 'ssm',
          partition: this.partition,
          resourceName: 'AWS-RunShellScript',
          resource: 'document'
        }),
        Arn.format({
          region: props.workloadRegion,
          account: this.account,
          service: 'ec2',
          partition: this.partition,
          resourceName: '*',
          resource: 'instance'
        })
      ]
    }))

    const zone = r53.HostedZone.fromLookup(this, 'Zone', { domainName: 'pwed.me' })

    const certificate = new acm.Certificate(this, 'Certificate', {
      domainName: 'admin.satisfactory.pwed.me',
      subjectAlternativeNames: [
        'api.admin.satisfactory.pwed.me'
      ],
      validation: acm.CertificateValidation.fromDns(zone)
    })

    const apiLog = new logs.LogGroup(this, 'ApiLogGroup')

    const api = new apigw.RestApi(this, 'API', {
      domainName: {
        domainName: 'api.admin.satisfactory.pwed.me',
        certificate
      },
      deployOptions: {
        loggingLevel: apigw.MethodLoggingLevel.INFO,
        accessLogDestination: new apigw.LogGroupLogDestination(apiLog),
        accessLogFormat: apigw.AccessLogFormat.jsonWithStandardFields(),
        dataTraceEnabled: true
      }
    })

    const authorizer = new apigw.CognitoUserPoolsAuthorizer(this, 'Authorizer', {
      cognitoUserPools: [userPool]
    })

    const lambdaIntegration = new apigw.LambdaIntegration(lambdaFunction, {
      timeout: Duration.seconds(29),
      // proxy: false,
      requestParameters: {
        'integration.request.header.X-Amz-Invocation-Type': 'method.request.header.InvocationType'
        // "integration.response.header.Access-Control-Allow-Origin": '"*"',
        // "integration.response.header.Access-Control-Allow-Methods": '"*"',
        // "integration.response.header.Access-Control-Allow-Headers": '"*"',

      }
      // integrationResponses:
    })
    const endpoint = api.root.addResource('{proxy+}')
    endpoint.addMethod('GET', lambdaIntegration, {
      authorizer,
      requestParameters: {
        'method.request.header.InvocationType': false
      }
    })
    endpoint.addMethod('PUT', lambdaIntegration, {
      authorizer,
      requestParameters: {
        'method.request.header.InvocationType': false
      }
    })
    endpoint.addCorsPreflight({ allowOrigins: ['*'] })

    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket')

    const distribution = new cloudfront.Distribution(this, 'WebDistrobution', {
      defaultBehavior: {
        origin: new aws_cloudfront_origins.S3Origin(websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
      },
      certificate,
      domainNames: [
        'admin.satisfactory.pwed.me'
      ],
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responsePagePath: '/',
          responseHttpStatus: 200
        },
        {
          httpStatus: 403,
          responsePagePath: '/',
          responseHttpStatus: 200
        }
      ]
    })

    new aws_s3_deployment.BucketDeployment(this, 'Deployment', {
      distribution,
      distributionPaths: ['/', '/*'],
      sources: [
        aws_s3_deployment.Source.asset(
          join(__dirname, '..', 'satisfactory-frontend'), {
            bundling: {
              image: lambda.Runtime.NODEJS_18_X.bundlingImage,
              command: [
                'bash',
                '-xc',
                'export npm_config_update_notifier=false && export npm_config_cache=$(mktemp -d) && npm install && npm run build && cp -au dist/* /asset-output'
              ]
            }
          }
        )
      ],
      destinationBucket: websiteBucket
    })

    new r53.ARecord(this, 'WebsiteARecord', {
      zone,
      target: r53.RecordTarget.fromAlias(new aws_route53_targets.CloudFrontTarget(distribution)),
      recordName: 'admin.satisfactory'
    })

    new r53.ARecord(this, 'ApiARecord', {
      zone,
      target: r53.RecordTarget.fromAlias(new aws_route53_targets.ApiGateway(api)),
      recordName: 'api.admin.satisfactory'
    })

    new r53.AaaaRecord(this, 'WebsiteAaaaRecord', {
      zone,
      target: r53.RecordTarget.fromAlias(new aws_route53_targets.CloudFrontTarget(distribution)),
      recordName: 'admin.satisfactory'
    })
  }
}
