#!/bin/bash

echo

echo ap-southeast-4a
ping -c 1 16.50.117.200 2>&1 | awk -F'/' 'END{ print (/^rtt/? "OK "$5" ms":"FAIL") }'

echo
echo ap-southeast-4b
ping -c 1 16.50.236.240 2>&1 | awk -F'/' 'END{ print (/^rtt/? "OK "$5" ms":"FAIL") }'

echo

echo ap-southeast-4c
ping -c 1 16.50.160.171 2>&1 | awk -F'/' 'END{ print (/^rtt/? "OK "$5" ms":"FAIL") }'
