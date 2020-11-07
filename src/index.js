#!/usr/bin/env nodejs

import Hapi from '@hapi/hapi';

import config from '../config/app.json';
import manager from './manager';
import router from './router';
import records from './records';
import streamRoutes from './api/stream-routes';
import recordsRoutes from './api/records-routes';

manager.closeProcess();

/**
 * Callback method starting the API after
 * initialization of the core.
 */
const openConnections = () => {
  const server = Hapi.Server(config.server);

  server.route(streamRoutes);
  server.route(recordsRoutes);

  server.start();
  console.log('DVB server running at:', server.info.uri);
  records.setServerUrl(server.info.uri);
  setInterval(manager.checkOpenedInstances, 10000);
};

process.on('unhandledRejection', (err) => {
  console.log(err);
  process.exit(1);
});

router.init(config.mumudvb, openConnections);
records.init(config.storage, router);
