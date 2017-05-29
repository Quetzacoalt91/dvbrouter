import Hapi from 'hapi';
import Request from 'request';

import config from './config';
import Router from './router';

const server = new Hapi.Server();
const router = new Router();
router.init(config.mumudvb);

server.connection(
    config.server,
);

server.route({
  method: 'GET',
  path: '/',
  handler: (request, reply) => {
    reply('Hello, world!');
  },
});

server.route({
  method: 'GET',
  path: '/stream',
  handler: (request, reply) => {
    const url = 'http://raspberrytv.local:4029/bysid/7168';
    Request(url).on('response', function (response) {
      reply(response);
    });
  },
});

// server.register([require('inert'), require('./socket')], (err) => {
//     if (err) {
//         throw err;
//     }
//     server.route(routes);
// });

server.start((err) => {
  if (err) {
    throw err;
  }
  console.info('DVB server running at:', server.info.uri);
});
