import { Construct } from 'constructs';
import {
  Duration,
  RemovalPolicy,
  Stack,
  StackProps,
  Tag,
  Tags,
  aws_iam as iam,
  aws_ssm as ssm,
  aws_ec2 as ec2,
  aws_efs as efs,
  aws_route53 as r53,
} from 'aws-cdk-lib'
import { join } from 'path';

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
          cidrMask: 28
        },
        {
          name: "data",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 28
        }
      ],
      enableDnsHostnames: true,
      enableDnsSupport: true,
      restrictDefaultSecurityGroup: false,
    })

    const data = new efs.FileSystem(this, "EfsData", {
      vpc,
      vpcSubnets: vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_ISOLATED }),
      enableAutomaticBackups: true,
      encrypted: true,
      // removalPolicy: RemovalPolicy.DESTROY,
    })

    const sg = new ec2.SecurityGroup(this, "SG", {
      vpc
    })

    data.connections.allowDefaultPortFrom(sg)

    sg.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.udp(15777),
      "Query Port",
    )

    sg.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.udp(7777),
      "Game Port",
    )

    sg.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.udp(15000),
      "Beacon Port",
    )

    sg.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.icmpPing(),
      "Ping",
    )

    const init = ec2.CloudFormationInit.fromConfigSets({
      configSets: {
        "default": ["00", "01", "02"]
      },
      configs: {
        "00":
          new ec2.InitConfig([
            ec2.InitCommand.shellCommand([
              "yum check-update -y",
              "yum upgrade -y",
            ].join("\n")),
          ]),
        "01":
          new ec2.InitConfig([
            ec2.InitUser.fromName("steam", { homeDir: "/home/steam" }),
            ec2.InitPackage.yum("amazon-efs-utils"),
            ec2.InitPackage.yum("libgcc.x86_64"),
            ec2.InitPackage.yum("glibc.x86_64"),
            ec2.InitPackage.yum("libgcc.i686"),
            ec2.InitPackage.yum("glibc.i686"),
            ec2.InitPackage.yum("git"),
            ec2.InitFile.fromAsset("/etc/systemd/system/satisfactory.service", join(__dirname, "..", "assets", "satisfactory.service"), { owner: "steam" }),
            ec2.InitCommand.shellCommand([
              "mkdir -p /home/steam/.config",
              "test -f /sbin/mount.efs",
              `echo ${data.fileSystemId}:/ /home/steam/.config efs defaults,_netdev,iam,tls >> /etc/fstab`,
              "mount -a -t efs,nfs4 defaults"
            ].join("\n")),
            ec2.InitCommand.shellCommand(
              "mkdir -p /home/steam/steamcmd"
            ),
            ec2.InitCommand.shellCommand(
              "curl -s https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz | tar -vxz",
              { cwd: "/home/steam/steamcmd" }
            ),
            ec2.InitCommand.shellCommand(
              "chown -R steam:steam /home/steam"
            ),
            ec2.InitCommand.shellCommand(
              'runuser -u steam -- /home/steam/steamcmd/steamcmd.sh +force_install_dir /home/steam/SatisfactoryDedicatedServer +login anonymous +app_update 1690800 validate +quit'
            ),
          ]),
        "02": new ec2.InitConfig([
          ec2.InitService.enable("satisfactory")
        ])
      },
    })

    const server = new ec2.Instance(this, "Server", {
      availabilityZone: this.availabilityZones[2],
      machineImage: ec2.MachineImage.latestAmazonLinux2(),
      vpc,
      instanceType: new ec2.InstanceType("t3.xlarge"),
      init,
      initOptions: {
        embedFingerprint: true,
        timeout: Duration.minutes(10),
      },
      userDataCausesReplacement: true,
      blockDevices: [
        {
          deviceName: '/dev/xvda',
          volume: ec2.BlockDeviceVolume.ebs(50, {
            volumeType: ec2.EbsDeviceVolumeType.GP3,
          }),
        }
      ],
      securityGroup: sg,
      vpcSubnets: vpc.selectSubnets({ subnetType: ec2.SubnetType.PUBLIC }),
      requireImdsv2: true,
      ssmSessionPermissions: true,
      associatePublicIpAddress: true,
    })

    const eip = new ec2.CfnEIP(this, "EIP")

    new ec2.CfnEIPAssociation(this, "EIPAssociaton", {
      allocationId: eip.attrAllocationId,
      instanceId: server.instanceId,
    })

    data.grantReadWrite(server.role)

    const zone = r53.HostedZone.fromLookup(this, "pwed.me", { domainName: "pwed.me" })

    const aRecord = new r53.ARecord(this, "ServerDNS", {
      target: r53.RecordTarget.fromIpAddresses(eip.ref),
      recordName: "satisfactory",
      zone,
      ttl: Duration.seconds(30),
    })

    const scheduleTag = new Tag("Schedule", "satisfactory")

    Tags.of(server).add(scheduleTag.key, scheduleTag.value)
    Tags.of(server).add("PublicName", aRecord.domainName)

    const maintanenceWindow = new ssm.CfnMaintenanceWindow(
      this,
      'MaintanenceWindow',
      {
        allowUnassociatedTargets: false,
        cutoff: 0,
        duration: 1,
        name: this.stackName + '-Maintanence-Window',
        schedule: 'cron(0 4 ? * * *)',
        scheduleTimezone: 'Australia/Melbourne',
      }
    );

    const maintanenceTarget = new ssm.CfnMaintenanceWindowTarget(
      this,
      'MaintanenceTarget',
      {
        resourceType: 'INSTANCE',
        targets: [
          {
            key: `tag:${scheduleTag.key}`,
            values: [scheduleTag.value],
          },
        ],
        windowId: maintanenceWindow.ref,
      }
    );

    const taskRole = new iam.Role(this, 'AutomationRole', {
      inlinePolicies: {
        ec2Stop: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              resources: ['*'],
              actions: ['ec2:StopInstances'],
              conditions: {
                StringEquals: JSON.parse(
                  `{"aws:ResourceTag/${scheduleTag.key}": "${scheduleTag.value}"}`
                ),
              },
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              resources: ['*'],
              actions: ['ec2:DescribeInstances', 'ec2:DescribeInstanceStatus'],
            }),
          ],
        }),
      },
      assumedBy: new iam.ServicePrincipal('ssm.amazonaws.com'),
    });

    new ssm.CfnMaintenanceWindowTask(this, 'BastionStop', {
      priority: 1,
      taskArn: 'AWS-StopEC2Instance',
      taskType: 'AUTOMATION',
      windowId: maintanenceWindow.ref,
      taskInvocationParameters: {
        maintenanceWindowAutomationParameters: {
          documentVersion: '1',
          parameters: {
            InstanceId: ['{{RESOURCE_ID}}'],
            AutomationAssumeRole: [taskRole.roleArn],
          },
        },
      },
      maxErrors: '1',
      maxConcurrency: '1',
      targets: [
        {
          key: 'WindowTargetIds',
          values: [maintanenceTarget.ref],
        },
      ],
    });
  }
}
