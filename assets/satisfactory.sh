#!/bin/bash

runuser -u steam -- /home/steam/steamcmd/steamcmd.sh +force_install_dir /home/steam/SatisfactoryDedicatedServer +login anonymous +app_update 1690800 validate +quit

echo """[Unit]
Description=Satisfactory dedicated server
Wants=network-online.target
After=syslog.target network.target nss-lookup.target network-online.target

[Service]
Environment='LD_LIBRARY_PATH=./linux64'
ExecStart=/home/steam/SatisfactoryDedicatedServer/FactoryServer.sh multihome=$(hostname -I)
User=steam
Group=steam
StandardOutput=journal
Restart=on-failure
WorkingDirectory=/home/steam

[Install]
WantedBy=multi-user.target
""" >> /etc/systemd/system/satisfactory.service
