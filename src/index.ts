#!/usr/bin/env nodejs

import Hapi from '@hapi/hapi';

import config from '../config/app.json';
import ProcessManager from './process-manager';
import streamRoutes from './api/stream-routes';
import Router from './router';

ProcessManager.closeRunningProcesses();

/**
 * Callback method starting the API after
 * initialization of the core.
 */
const openConnections = () => {
  const server = new Hapi.Server(config.server);

  server.route(streamRoutes(new Router(config.mumudvb)));

  server.start();
  console.log('DVB server running at:', server.info.uri);
};

process.on('unhandledRejection', (err) => {
  console.log(err);
  process.exit(1);
});

openConnections();