#!/bin/env python

import boto3

ec2 = boto3.resource("ec2", region_name="ap-southeast-4")
ssm = boto3.client("ssm", region_name="ap-southeast-4")
instanceId="i-060fc8a8cafc45e0f"

def satisfactory_status(event):
    response = ssm.send_command(
        InstanceIds=[instanceId],
        DocumentName="AWS-RunShellScript",
        Parameters={
            "commands": [
                "systemctl show --no-pager satisfactory.service"
            ]
        }
    )
    command_id = response['Command']['CommandId']

    ssm.get_waiter("command_executed").wait(CommandId=command_id, InstanceId=instanceId)
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=instanceId,
    )
    status = ""
    for entry in output["StandardOutputContent"].split('\n'):
        kv = entry.split("=", 1)
        if kv[0] == "SubState":
            status = kv[1]
    print(status)
    return

def satisfactory_start(event):
    response = ssm.send_command(
        InstanceIds=[instanceId],
        DocumentName="AWS-RunShellScript",
        Parameters={
            "commands": [
                "systemctl start satisfactory.service",
                "systemctl show --no-pager satisfactory.service"
            ]
        }
    )
    command_id = response['Command']['CommandId']

    ssm.get_waiter("command_executed").wait(CommandId=command_id, InstanceId=instanceId)
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=instanceId,
    )
    status = ""
    for entry in output["StandardOutputContent"].split('\n'):
        kv = entry.split("=", 1)
        if kv[0] == "SubState":
            status = kv[1]
    print(status)
    return

def satisfactory_stop(event):
    response = ssm.send_command(
        InstanceIds=[instanceId],
        DocumentName="AWS-RunShellScript",
        Parameters={
            "commands": [
                "systemctl stop satisfactory.service",
                "systemctl show --no-pager satisfactory.service"
            ]
        }
    )
    command_id = response['Command']['CommandId']

    ssm.get_waiter("command_executed").wait(CommandId=command_id, InstanceId=instanceId)
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=instanceId,
    )
    status = ""
    for entry in output["StandardOutputContent"].split('\n'):
        kv = entry.split("=", 1)
        if kv[0] == "SubState":
            status = kv[1]
    print(status)
    return

def satisfactory_update(event):
    satisfactory_stop(event)
    response = ssm.send_command(
        InstanceIds=[instanceId],
        DocumentName="AWS-RunShellScript",
        Parameters={
            "commands": [
                "runuser -u steam -- /home/steam/steamcmd/steamcmd.sh +force_install_dir /home/steam/SatisfactoryDedicatedServer +login anonymous +app_update 1690800 validate +quit"
            ]
        }
    )
    command_id = response['Command']['CommandId']

    ssm.get_waiter("command_executed").wait(CommandId=command_id, InstanceId=instanceId)
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=instanceId,
    )
    print(output["StandardOutputContent"])
    satisfactory_start(event)
    return

def server_status(event):
    instance = ec2.Instance(instanceId)
    security_group = ec2.SecurityGroup(instance.security_groups[0]["GroupId"])
    security_group.load()
    ports = ""
    for rule in security_group.ip_permissions:
        ports = f"{ports}{rule['FromPort']}/{rule['IpProtocol']}\n"
    tags = {}
    for tag in instance.tags:
        tags[tag["Key"]] = tag["Value"]
    print(tags)
    print(ports)
    print(instance.state["Name"])
    print(instance.public_ip_address)
    return

def server_stop(event):
    satisfactory_stop(event)
    instance = ec2.Instance(instanceId)
    instance.stop()
    instance.wait_until_stopped()

def server_start(event):
    instance = ec2.Instance(instanceId)
    instance.start()
    instance.wait_until_running()
    satisfactory_update(event)

def server_restart(event):
    server_stop(event)
    server_start(event)

def server_update(event):
    satisfactory_stop(event)
    response = ssm.send_command(
        InstanceIds=[instanceId],
        DocumentName="AWS-RunShellScript",
        Parameters={
            "commands": [
                "yum upgrade -y"
            ]
        }
    )
    command_id = response['Command']['CommandId']

    ssm.get_waiter("command_executed").wait(CommandId=command_id, InstanceId=instanceId)
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=instanceId,
    )
    print(output["StandardOutputContent"])
    server_restart(event)
    return


def handler(event: dict):
    match event["path"]:
        case "/":
            return
        case "/satisfactory":
            return satisfactory_status(event)
        case "/satisfactory/update":
            return satisfactory_update(event)
        case "/server":
            return server_status(event)
        case "/server/start":
            return server_start(event)
        case "/server/stop":
            return server_stop(event)
        case "/server/restart":
            return server_restart(event)
        case "/server/update":
            return


if __name__ == "__main__":
    server_update({})