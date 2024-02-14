import { Construct } from "constructs";
import {
  Arn,
  Stack,
  StackProps,
  aws_autoscaling as autoscaling,
  aws_ec2 as ec2,
  aws_efs as efs,
  aws_iam as iam,
  aws_route53 as r53,
  aws_ssm as ssm,
} from "aws-cdk-lib";
import { join } from "path";
import { readFileSync } from "fs";

export class CdkSatisfactoryStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "VPC", {
      maxAzs: 3,
      subnetConfiguration: [
        {
          name: "public",
          subnetType: ec2.SubnetType.PUBLIC,
          mapPublicIpOnLaunch: true,
          cidrMask: 28,
        },
        {
          name: "data",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 28,
        },
      ],
      enableDnsHostnames: true,
      enableDnsSupport: true,
      restrictDefaultSecurityGroup: false,
    });

    const zone = r53.HostedZone.fromLookup(this, "pwed.me", {
      domainName: "pwed.me",
    });

    const data = new efs.FileSystem(this, "EfsData", {
      vpc,
      vpcSubnets: vpc.selectSubnets({
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      }),
      enableAutomaticBackups: true,
      encrypted: true,
    }); 

    const instanceParameter = new ssm.StringParameter(
      this,
      "InstanceIdParameter",
      {
        parameterName: "/satisfactory/instance/id",
        stringValue: "placeholder",
      }
    );

    const sg = new ec2.SecurityGroup(this, "SG", {
      vpc,
    });

    const prefixList = new ec2.CfnPrefixList(this, "PrefixList", {
      maxEntries: 10,
      addressFamily: "IPv4",
      prefixListName: "SatisfactoryDedicatedServerAllowedIPs-" + this.region,
    });

    const peer = ec2.Peer.prefixList(prefixList.ref);

    data.connections.allowDefaultPortFrom(sg);

    sg.addIngressRule(peer, ec2.Port.udp(15777), "Query Port");

    sg.addIngressRule(peer, ec2.Port.udp(7777), "Game Port");

    sg.addIngressRule(peer, ec2.Port.udp(15000), "Beacon Port");

    sg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.icmpPing(), "Ping");

    const init = ec2.CloudFormationInit.fromConfigSets({
      configSets: {
        default: ["00", "01", "02"],
      },
      configs: {
        "00": new ec2.InitConfig([
          ec2.InitCommand.shellCommand(
            [
              `OLD_INSTANCE=$(aws --region ${this.region} ssm get-parameter --name ${instanceParameter.parameterName} --query "Parameter.Value" --output text)`,
              `[ -z $OLD_INSTANCE ] && echo 'Instance does not exist' || aws --region ${this.region} ec2 stop-instances --instance-ids $OLD_INSTANCE || echo 'Instance probably stopped already'`,
              'TOKEN=$(curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")',
              'INSTANCE_ID=$(curl -H "X-aws-ec2-metadata-token: $TOKEN" -v http://169.254.169.254/latest/meta-data/instance-id)',
              `PUBLIC_IP=$(curl -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/public-ipv4)`,
              `aws --region ${this.region} route53 change-resource-record-sets --hosted-zone-id ${zone.hostedZoneId} --change-batch "{\\"Changes\\":[{\\"Action\\":\\"UPSERT\\",\\"ResourceRecordSet\\":{\\"Name\\":\\"satisfactory.${zone.zoneName}.\\",\\"Type\\":\\"A\\",\\"TTL\\":5,\\"ResourceRecords\\":[{\\"Value\\":\\"$PUBLIC_IP\\"}]}}]}"`,
              `aws --region ${this.region} ssm put-parameter --name /satisfactory/instance/id --value $INSTANCE_ID --type String --overwrite`,
            ].join("; ")
          ),
          ec2.InitCommand.shellCommand("yum check-update -y", {
            ignoreErrors: true,
          }),
          ec2.InitCommand.shellCommand("yum upgrade -y"),
          ec2.InitUser.fromName("steam", { homeDir: "/home/steam" }),
        ]),
        "01": new ec2.InitConfig([
          ec2.InitPackage.yum("amazon-efs-utils"),
          ec2.InitPackage.yum("libgcc.x86_64"),
          ec2.InitPackage.yum("glibc.x86_64"),
          ec2.InitPackage.yum("libgcc.i686"),
          ec2.InitPackage.yum("glibc.i686"),
          ec2.InitPackage.yum("git"),
          ec2.InitCommand.shellCommand("mkdir -p /home/steam/"),
          ec2.InitCommand.shellCommand("test -f /sbin/mount.efs"),
          ec2.InitCommand.shellCommand(`echo ${data.fileSystemId}:/ /home/steam/ efs defaults,_netdev,iam,tls >> /etc/fstab`),
          ec2.InitCommand.shellCommand("mount -a -t efs,nfs4 defaults"),
          ec2.InitCommand.shellCommand("mkdir -p /home/steam/steamcmd"),
          ec2.InitCommand.shellCommand(
            "curl -s https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz | tar -vxz",
            { cwd: "/home/steam/steamcmd" }
          ),
          ec2.InitCommand.shellCommand("chown -R steam:steam /home/steam"),
          ec2.InitCommand.shellCommand(
            readFileSync(
              join(__dirname, "..", "assets", "satisfactory.sh")
            ).toString()
          ),
        ]),
        "02": new ec2.InitConfig([ec2.InitService.enable("satisfactory")]),
      },
    });

    const serverTemplate = new ec2.LaunchTemplate(this, "ServerTemplate", {
      machineImage: ec2.MachineImage.latestAmazonLinux2(),
      instanceType: new ec2.InstanceType("m5.xlarge"),
      blockDevices: [
        {
          deviceName: "/dev/xvda",
          volume: ec2.BlockDeviceVolume.ebs(50, {
            volumeType: ec2.EbsDeviceVolumeType.GP3,
          }),
        },
      ],
      securityGroup: sg,
      requireImdsv2: true,
      associatePublicIpAddress: true,
      role: new iam.Role(this, "ServerRole", {
        assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
      }),
      detailedMonitoring: true,
    });

    const asg = new autoscaling.AutoScalingGroup(this, "ASG", {
      vpc,
      vpcSubnets: vpc.selectSubnets({ subnetType: ec2.SubnetType.PUBLIC }),
      init,
      initOptions: {
        embedFingerprint: true,
      },
      ssmSessionPermissions: true,
      minCapacity: 0,
      maxCapacity: 1,
      mixedInstancesPolicy: {
        instancesDistribution: {
          onDemandBaseCapacity: 0,
          onDemandPercentageAboveBaseCapacity: 0,
        },
        launchTemplate: serverTemplate,
        launchTemplateOverrides: [
          { instanceType: new ec2.InstanceType("t3.xlarge") },
        ],
      },
      signals: autoscaling.Signals.waitForCount(0),
      groupMetrics: [autoscaling.GroupMetrics.all()],
    });

    data.grantReadWrite(asg.role);
    asg.role.attachInlinePolicy(
      new iam.Policy(this, "ServerPolicy", {
        statements: [
          new iam.PolicyStatement({
            actions: [
              "ec2:StopInstances",
              "ec2:DescribeInstances",
              "ec2:DescribeInstanceStatus",
            ],
            effect: iam.Effect.ALLOW,
            resources: [
              Arn.format(
                {
                  service: "ec2",
                  resource: "instance",
                  resourceName: "*",
                },
                this
              ),
              Arn.format(
                {
                  service: "ec2",
                  resource: "network-interface",
                  resourceName: "*",
                },
                this
              ),
            ],
          }),
          new iam.PolicyStatement({
            actions: ["ssm:GetParameter", "ssm:PutParameter"],
            effect: iam.Effect.ALLOW,
            resources: [instanceParameter.parameterArn],
          }),
          new iam.PolicyStatement({
            actions: ["route53:ChangeResourceRecordSets"],
            effect: iam.Effect.ALLOW,
            resources: [zone.hostedZoneArn],
          }),
        ],
      })
    );

    asg.scaleOnSchedule("BedTime", {
      schedule: autoscaling.Schedule.cron({
        hour: "0",
        minute: "0",
      }),
      timeZone: "Australia/Melbourne",
      desiredCapacity: 0,
    });

    // SSM Export values

    new ssm.StringParameter(this, "AsgParameter", {
      parameterName: "/satisfactory/asg/name",
      stringValue: asg.autoScalingGroupName,
    });

    new ssm.StringParameter(this, "DnsNameParameter", {
      parameterName: "/satisfactory/network/dns",
      stringValue: `satisfactory.${zone.zoneName}`,
    });

    new ssm.StringParameter(this, "PrefixListParameter", {
      parameterName: "/satisfactory/network/prefix-list",
      stringValue: prefixList.ref,
    });

    new ssm.StringParameter(this, "SecurityGroupParameter", {
      parameterName: "/satisfactory/network/security-group",
      stringValue: sg.securityGroupId,
    });
  }
}
