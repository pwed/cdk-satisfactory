#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { CdkSatisfactoryStack } from '../lib/cdk-satisfactory-stack';
import { CdkSatisfactoryAdminStack } from '../lib/cdk-satisfactory-admin';

const app = new App();
const workloadStack = new CdkSatisfactoryStack(app, 'CdkSatisfactoryStack', {
  env: { account: '806124249357', region: 'ap-southeast-4' },
});

new CdkSatisfactoryAdminStack(app, 'CdkSatisfactoryAdminStack', {
  env: { account: '806124249357', region: 'us-east-1' },
  workloadRegion: workloadStack.region,
});