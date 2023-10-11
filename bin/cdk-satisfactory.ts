#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { CdkSatisfactoryStack } from '../lib/cdk-satisfactory-stack';

const app = new App();
new CdkSatisfactoryStack(app, 'CdkSatisfactoryStack', {
  env: { account: '806124249357', region: 'ap-southeast-4' },
});