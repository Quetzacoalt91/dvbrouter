#!/usr/bin/env nodejs

import Hapi from 'hapi';
import Request from 'request';

import config from '../config/config';
import { closeProcess } from './manager';
import Router from './router';

closeProcess();
const router = new Router();
router.init(config.mumudvb);

const server = new Hapi.Server();

server.connection(
    config.server,
);

server.route({
  method: 'GET',
  path: '/',
  handler: (request, reply) => {
    reply('MumuDVB router is alive!');
  },
});

server.route({
  method: 'GET',
  path: '/playlist',
  handler: (request, reply) => {
    reply(router.buildPlaylist(request.connection.info.protocol, request.info.host))
      .header('Content-Type', 'audio/x-mpegurl')
      .header("Content-Disposition", "attachment; filename=" + 'playlist.m3u');
  },
});

server.route({
  method: 'GET',
  path: '/stream/{id}',
  handler: (request, reply) => {
    router.onConnect(request, (err, data) => {
      if (err) {
        return reply(err).code(500);
      }
      const url = `http://127.0.0.1:${data.port}/bysid/${data.channel.service_id}`;
      Request(url).on('response', function (response) {
        reply(response);
      });
    });
  },
});

server.on('request-internal', (request, event, tags) => {
  if (tags.aborted || tags.closed) {
    router.onDisconnect(request);
  }
});

server.start((err) => {
  if (err) {
    throw err;
  }
  console.info('DVB server running at:', server.info.uri);
});
