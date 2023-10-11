#!/bin/sh

chown -R steam:steam /home/steam/.config

echo $@

pwd

exec runuser -u steam /home/steam/StartServer.sh