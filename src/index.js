#!/usr/bin/env nodejs

import Hapi from 'hapi';

import config from '../config/app.json';
import { closeProcess, checkOpenedInstances } from './manager';
import Router from './router';
import Records from './records';
import streamRoutes from './api/stream-routes';
import recordsRoutes from './api/records-routes';

closeProcess();
const router = new Router();
const records = new Records();

/**
 * Callback method starting the API after
 * initialization of the core.
 */
const openConnections = () => {
  const server = new Hapi.Server();

  server.connection(
      config.server,
  );

  server.route(streamRoutes);
  server.route(recordsRoutes);

  server.start((err) => {
    if (err) {
      throw err;
    }
    console.info('DVB server running at:', server.info.uri);
    records.setServerUrl(server.info.uri);
    setInterval(checkOpenedInstances, 10000);
  });

};

router.init(config.mumudvb, openConnections);
records.init(config.storage, router);
