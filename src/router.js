import fs from 'fs';
import ini from 'ini';
import Request from 'request';

import { initManager, linkCard, closeCard } from './manager';

class router {
  config = {};
  servers = {};
  clients = {};

  init(config) {
    initManager(config);
    this.config = config;
    const path = this.config.path;
    const that = this;

    console.info('Initializing channel list from config files.');

    fs.readdirSync(path).forEach((file) => {
      const configFile = path + '/' + file;
      const configContent = ini.parse(fs.readFileSync(configFile, 'utf-8'));
      const data = {
        port: configContent.port_http,
        configFile,
      };
      that.clients[data.port] = [];
      that.registerChannels(data);
    });
  }

  onConnect(request, callback) {
    const id = parseInt(request.params.id, 10);
    if (typeof this.servers[id] === 'undefined') {
      return callback('Unregistered channel');
    }

    const associatedPort = this.servers[id].port;

    this.clients[associatedPort].push(request);

    linkCard(this.servers[id], (err, data) => {
      if (err) {
        return callback(err);
      }
      return callback(null, Object.assign({}, data, { channel: this.servers[id] }));
    });
  }

  onDisconnect(request) {
    clients.forEach(function(requests, port) {
      requests.forEach(function(r, i) {
        if (r === request) {
          requests.splice(i, 1);
          // If the client was the last one, close connection to DVB
          if (requests.length === 0) {
            closeCard({ port });
          }
        }
      });
    });
  }

  registerChannels(data) {
    const that = this;

    linkCard(data, (err, data) => {

      const channelUrl = `http://127.0.0.1:${data.port}/channels_list.json`;
      Request.get(channelUrl, function (err, res) {
        if (err) {
          //closeCard(data);
          throw new Error(err);
        }
        const channels = JSON.parse(res.body);
        channels.forEach(function(channel) {
          console.log(`- Register ${channel.name} on port ${data.port}`);
          that.servers[channel.service_id] = Object.assign(data, channel);
        });
        closeCard(data);
      });
    });
  }
}

export default router;
