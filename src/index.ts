#!/usr/bin/env nodejs

import {Server} from '@hapi/hapi';

import ProcessManager from './process-manager';
import streamRoutes from './api/stream-routes';
import Router from './router';
const config = require('../config/app.json');

ProcessManager.closeRunningProcesses();

/**
 * Callback method starting the API after
 * initialization of the core.
 */
const openConnections = async () => {
  const server = new Server(config.server);
  const manager = new ProcessManager(config.mumudvb.channels);
  const router = new Router(config.mumudvb, manager);

  await router.init();

  setInterval(() => manager.findAndCloseUnusedInstances(), 10000);
  console.log('Check of unused instances initialized');

  server.route(streamRoutes(router));
  server.start();
  console.log('DVB server running at:', server.info.uri);
};

process.on('unhandledRejection', (err) => {
  console.log(err);
  process.exit(1);
});

openConnections();