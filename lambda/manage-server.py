#!/bin/env python

import boto3
import sys
import json
import pprint
import os


WORKLOAD_REGION = os.environ.get("WORKLOAD_REGION", "us-east-1")
ec2 = boto3.resource("ec2", region_name=WORKLOAD_REGION)
ssm = boto3.client("ssm", region_name=WORKLOAD_REGION)

def getInstanceId():
    instanceId = ssm.get_parameter(Name="/satisfactory/instance/id")["Parameter"]["Value"]
    return instanceId


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
    stop_output = satisfactory_stop(event)
    if not stop_output["statusCode"] == 200:
        print("Failed to stop service")
        return craft_response(event, status_code=500, body=stop_output)
    update_output = run_commands(
        [
            "runuser -u steam -- /home/steam/steamcmd/steamcmd.sh"
            " +force_install_dir /home/steam/SatisfactoryDedicatedServer"
            " +login anonymous"
            " +app_update 1690800"
            " validate +quit",
        ]
    )
    if not update_output["Success"]:
        print("Failed to update app")
        return craft_response(event, status_code=500, body=update_output)
    start_output = satisfactory_start(event)
    if not start_output["statusCode"] == 200:
        print("Failed to start service")
        return craft_response(event, status_code=500, body=start_output)
    return craft_response(
        event, body={"Status": start_output, "UpdateOutput": update_output}
    )


def server_status(event):
    instanceId = getInstanceId()
    instance = ec2.Instance(instanceId)
    security_group = ec2.SecurityGroup(instance.security_groups[0]["GroupId"])
    security_group.load()
    ports = []
    for rule in security_group.ip_permissions:
        ports.append(f"{rule['FromPort']}/{rule['IpProtocol']}")
    tags = {}
    for tag in instance.tags:
        tags[tag["Key"]] = tag["Value"]
    return craft_response(
        event,
        body={
            "Instance": instance.id,
            "Ip": instance.public_ip_address,
            "State": instance.state["Name"],
            "Tags": tags,
            "Ports": ports,
        },
    )


def server_stop(event):
    instanceId = getInstanceId()
    satisfactory_stop(event)
    instance = ec2.Instance(instanceId)
    instance.stop()
    instance.wait_until_stopped()


def server_start(event):
    instanceId = getInstanceId()
    instance = ec2.Instance(instanceId)
    instance.start()
    instance.wait_until_running()


def server_restart(event):
    server_stop(event)
    server_start(event)


def server_update(event):
    satisfactory_stop(event)
    output = run_commands(["yum upgrade -y"])
    server_restart(event)
    return


def handler(event: dict, context):
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

        case _:
            return craft_response(event, status_code=404, body="path not found")


if __name__ == "__main__":
    pprint.pp(handler({"path": sys.argv[1]}, {}))
