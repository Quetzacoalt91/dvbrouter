import Hapi from 'hapi';

import config from './config';

const server = new Hapi.Server();

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
