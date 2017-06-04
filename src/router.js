import fs from 'fs';
import ini from 'ini';
import Request from 'request';
import async from 'async';

import { initManager, linkCard, closeCard } from './manager';

class router {
  config = {};
  servers = {};
  clients = [];

  init(config) {
    initManager(config);
    this.config = config;
    const path = this.config.path;
    const that = this;

    console.info('Initializing channel list from config files.');

    const q = async.queue(function(data, callback) {
      that.registerChannels(data.data, callback);
    }, config.channels);

    fs.readdirSync(path).forEach((file) => {
      const configFile = path + '/' + file;
      const configContent = ini.parse(fs.readFileSync(configFile, 'utf-8'));
      const data = {
        port: configContent.port_http,
        configFile,
      };
      that.clients[data.port] = [];
      q.push({ data });
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
    const that = this;
    setTimeout(() => {
      that.clients.forEach(function(requests, port) {
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
    }, 10000);
  }

  registerChannels(data, callback) {
    const that = this;

    async.retry({ times: 5, interval: 500 }, function(clbk) {
      linkCard(data, clbk);
    }, function(err, resp) {
      if (err) {
        throw new Error(err);
      }

      const channelUrl = `http://127.0.0.1:${resp.port}/channels_list.json`;
      Request.get(channelUrl, function (err3, res) {
        if (err3) {
          if (callback) {
            closeCard(resp, callback);
          } else {
            closeCard(resp);
            throw new Error(err3);
          }
        }
        const channels = JSON.parse(res.body);
        channels.forEach(function(channel) {
          console.log(`- Register ${channel.name} on port ${resp.port}`);
          that.servers[channel.service_id] = Object.assign(resp, channel);
        });
        closeCard(resp, callback);
      });
    });
  }
}

export default router;
