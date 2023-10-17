import { Construct } from 'constructs';
import {
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
    aws_ssm as ssm,
    Arn,
    Duration,
    aws_amplify as amplify,
} from 'aws-cdk-lib'

import { join } from 'path';

export class CdkSatisfactoryAdminStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const userPool = new cognito.UserPool(this, "UserPool", {
            selfSignUpEnabled: true,
        })
        const client = userPool.addClient("CognitoClient")

        const lambdaFunction = new lambda.Function(this, "AdminFunction", {
            runtime: lambda.Runtime.PYTHON_3_10,
            code: lambda.Code.fromAsset(join(__dirname, "..", "lambda")),
            handler: "manage-server.handler",
            architecture: lambda.Architecture.ARM_64,
            timeout: Duration.minutes(2),
        })
        lambdaFunction.addToRolePolicy(new iam.PolicyStatement({
            actions: [
                "*",
            ],
            effect: iam.Effect.ALLOW,
            resources: ["*"]
        }))

        const authorizer = new apigw.CognitoUserPoolsAuthorizer(this, "Authorizer", {
            cognitoUserPools: [userPool]
        })

        const lambdaIntegration = new apigw.LambdaIntegration(lambdaFunction)

        const zone = r53.HostedZone.fromLookup(this, "Zone", { domainName: "pwed.me" })

        const certificate = new acm.Certificate(this, "Certificate", {
            domainName: "admin.satisfactory.pwed.me",
            subjectAlternativeNames: [
                "api.admin.satisfactory.pwed.me"
            ],
            validation: acm.CertificateValidation.fromDns(zone)
        })

        const api = new apigw.RestApi(this, "API", {
            domainName: {
                domainName: "api.admin.satisfactory.pwed.me",
                certificate,
            }
        })
        const endpoint = api.root.addResource("{proxy+}")
        endpoint.addMethod("GET", lambdaIntegration, { authorizer })
        endpoint.addCorsPreflight({allowOrigins: ["*"]})


        const websiteBucket = new s3.Bucket(this, "WebsiteBucket")

        const distribution = new cloudfront.Distribution(this, "WebDistrobution", {
            defaultBehavior: {
                origin: new aws_cloudfront_origins.S3Origin(websiteBucket),
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            },
            certificate,
            domainNames: [
                "admin.satisfactory.pwed.me"
            ],
            defaultRootObject: "index.html",
            errorResponses: [
                {
                    httpStatus: 404,
                    responsePagePath: "/",
                    responseHttpStatus: 200,
                }
            ]
        })

        new aws_s3_deployment.BucketDeployment(this, "Deployment", {
            distribution,
            distributionPaths: ["/", "/*"],
            sources: [
                aws_s3_deployment.Source.asset(
                    join(__dirname, "..", "satisfactory-frontend"), {
                    bundling: {
                        image: lambda.Runtime.NODEJS_18_X.bundlingImage,
                        command: [
                            "bash",
                            "-xc",
                            "export npm_config_update_notifier=false && export npm_config_cache=$(mktemp -d) && npm install && npm run build && cp -au dist/* /asset-output"
                        ],
                        environment: {
                            "VITE_USER_POOL_ID": userPool.userPoolId,
                            "VITE_CLIENT_ID": client.userPoolClientId,
                        }
                    }
                }
                )
            ],
            destinationBucket: websiteBucket,
        })

        new r53.ARecord(this, "WebsiteARecord", {
            zone,
            target: r53.RecordTarget.fromAlias(new aws_route53_targets.CloudFrontTarget(distribution)),
            recordName: "admin.satisfactory",
        })

        new r53.ARecord(this, "ApiARecord", {
            zone,
            target: r53.RecordTarget.fromAlias(new aws_route53_targets.ApiGateway(api)),
            recordName: "api.admin.satisfactory",
        })

        new r53.AaaaRecord(this, "WebsiteAaaaRecord", {
            zone,
            target: r53.RecordTarget.fromAlias(new aws_route53_targets.CloudFrontTarget(distribution)),
            recordName: "admin.satisfactory",
        })

    }
}