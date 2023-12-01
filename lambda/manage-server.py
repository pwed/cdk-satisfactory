#!/bin/env python

import json
import os
import pprint
import sys

import boto3

WORKLOAD_REGION = os.environ.get("WORKLOAD_REGION", "us-east-1")
ec2 = boto3.resource("ec2", region_name=WORKLOAD_REGION)
ec2_client = boto3.client("ec2", region_name=WORKLOAD_REGION)
ssm = boto3.client("ssm", region_name=WORKLOAD_REGION)
autoscaling = boto3.client("autoscaling", region_name=WORKLOAD_REGION)


def getInstanceId():
    instanceId = ssm.get_parameter(Name="/satisfactory/instance/id")["Parameter"][
        "Value"
    ]
    return instanceId


def getPrefixListId():
    prefixListId = ssm.get_parameter(Name="/satisfactory/network/prefix-list")[
        "Parameter"
    ]["Value"]
    return prefixListId


def getAutoScalingGroup():
    autoScalingGroupName = ssm.get_parameter(Name="/satisfactory/asg/name")[
        "Parameter"
    ]["Value"]
    return autoScalingGroupName


def getIP():
    ip = ssm.get_parameter(Name="/satisfactory/network/ip")["Parameter"]["Value"]
    return ip


def getSecurityGroup():
    securityGroup = ssm.get_parameter(Name="/satisfactory/network/security-group")[
        "Parameter"
    ]["Value"]
    return securityGroup


def getDomain():
    domain = ssm.get_parameter(Name="/satisfactory/network/dns")["Parameter"]["Value"]
    return domain


def craft_response(event, *, status_code=200, body={}):
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
        },
        "body": json.dumps(body, indent=2),
    }


def run_commands(commands):
    instanceId = getInstanceId()
    try:
        response = ssm.send_command(
            InstanceIds=[instanceId],
            DocumentName="AWS-RunShellScript",
            Parameters={"commands": commands},
        )
    except Exception as e:
        print(e)
        return {"Success": False, "Output": None, "Error": "{}".format(e)}
    command_id = response["Command"]["CommandId"]

    ssm.get_waiter("command_executed").wait(CommandId=command_id, InstanceId=instanceId)
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=instanceId,
    )
    return {
        "Success": True,
        "Output": output,
    }


def get_systemd_status_from_output(output):
    status = ""
    for entry in output["Output"]["StandardOutputContent"].split("\n"):
        kv = entry.split("=", 1)
        if kv[0] == "SubState":
            status = kv[1]
    return status


def satisfactory_status(event):
    output = run_commands(["systemctl show --no-pager satisfactory.service"])
    if not output["Success"]:
        return craft_response(event, status_code=500, body=output["Error"])
    status = get_systemd_status_from_output(output)
    return craft_response(event, body={"Status": status})


def satisfactory_start(event):
    output = run_commands(
        [
            "systemctl start satisfactory.service",
            "systemctl show --no-pager satisfactory.service",
        ]
    )
    if not output["Success"]:
        return craft_response(event, status_code=500, body=output["Error"])
    status = get_systemd_status_from_output(output)
    return craft_response(event, body={"Status": status})


def satisfactory_stop(event):
    output = run_commands(
        [
            "systemctl stop satisfactory.service",
            "systemctl show --no-pager satisfactory.service",
        ]
    )
    if not output["Success"]:
        return craft_response(event, status_code=500, body=output["Error"])
    status = get_systemd_status_from_output(output)
    return craft_response(event, body={"Status": status})


def satisfactory_update(event):
    update_output = run_commands(
        [
            "systemctl stop satisfactory.service",
            "runuser -u steam -- /home/steam/steamcmd/steamcmd.sh"
            " +force_install_dir /home/steam/SatisfactoryDedicatedServer"
            " +login anonymous"
            " +app_update 1690800 validate"  # " -beta experimental"
            " +quit",
            "systemctl start satisfactory.service",
        ]
    )
    if not update_output["Success"]:
        print("Failed to update app")
        return craft_response(
            event,
            status_code=500,
            body=update_output,
        )
    return craft_response(
        event,
        body=update_output,
    )


def server_status(event):
    asg = getAutoScalingGroup()
    instanceId = getInstanceId()
    prefixListId = getPrefixListId()
    desiredCapacity = autoscaling.describe_auto_scaling_groups(
        AutoScalingGroupNames=[asg]
    )["AutoScalingGroups"][0]["DesiredCapacity"]
    ports = []
    tags = {}
    instanceState = "dead"
    if desiredCapacity != 0:
        instance = ec2.Instance(instanceId)
        for tag in instance.tags:
            tags[tag["Key"]] = tag["Value"]
        instanceState = instance.state["Name"]
    prefix_list_entries_response = ec2_client.get_managed_prefix_list_entries(
        PrefixListId=prefixListId
    )
    prefix_list_entries = prefix_list_entries_response["Entries"]
    security_group = ec2.SecurityGroup(getSecurityGroup())
    security_group.load()
    for rule in security_group.ip_permissions:
        if not rule["IpProtocol"] == "icmp":
            ports.append(f"{rule['FromPort']}/{rule['IpProtocol']}")

    return craft_response(
        event,
        body={
            "DNS": getDomain(),
            "State": instanceState,
            "Ports": ports,
            "AllowedIps": prefix_list_entries,
        },
    )


def server_stop(event):
    satisfactory_stop(event)
    autoscaling.set_desired_capacity(
        AutoScalingGroupName=getAutoScalingGroup(),
        DesiredCapacity=0,
    )


def server_start(event):
    autoscaling.set_desired_capacity(
        AutoScalingGroupName=getAutoScalingGroup(),
        DesiredCapacity=1,
    )


def server_restart(event):
    autoscaling.start_instance_refresh(
        AutoScalingGroupName=getAutoScalingGroup(),
    )


def server_update(event):
    output = run_commands(
        [
            "systemctl stop satisfactory.service",
            "yum upgrade -y",
            "systemctl start satisfactory.service",
        ]
    )
    if not output["Success"]:
        return craft_response(event, status_code=500, body=output)
    return craft_response(event, body=output)


def add_ip_to_prefix_list(event):
    try:
        prefixListId = getPrefixListId()
        ip = event["requestContext"]["identity"]["sourceIp"]
        version = ec2_client.describe_managed_prefix_lists(
            PrefixListIds=[prefixListId]
        )["PrefixLists"][0]["Version"]
        result = ec2_client.modify_managed_prefix_list(
            PrefixListId=prefixListId,
            AddEntries=[
                {
                    "Cidr": f"{ip}/32",
                    "Description": "",
                }
            ],
            CurrentVersion=version,
        )
    except Exception as e:
        return craft_response(event, status_code=500, body={"Error": "{}".format(e)})
    return craft_response(event, body=result)


def handler(event: dict, context):
    pprint.pp(event)
    pprint.pp(context)
    match event["path"]:
        case "/satisfactory":
            return satisfactory_status(event)

        case "/satisfactory/start":
            return satisfactory_start(event)

        case "/satisfactory/stop":
            return satisfactory_stop(event)

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
            return server_update(event)

        case "/network/prefix-list/add":
            match event["httpMethod"]:
                case "PUT":
                    return add_ip_to_prefix_list(event)

        case _:
            return craft_response(event, status_code=404, body="path not found")


if __name__ == "__main__":
    pprint.pp(handler({"path": sys.argv[1]}, {}))
