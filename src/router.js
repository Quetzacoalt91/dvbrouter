import fs from 'fs';
import ini from 'ini';
import Request from 'request';
import async from 'async';
import { isAbsolute } from 'path';

import manager from './manager';

const router = {
  config: {},
  servers: {},
  filters: [],

  /**
   * Get all details from config file, then find all mumudvb instances
   * available in given path before running them for channels list
   *
   * @param {object} config from config file
   */
  init(config, callback) {
    manager.initManager(config);
    this.config = config;
    this.filters = this.config.filters;
    const path = isAbsolute(this.config.path) ? this.config.path : `${__dirname}/${this.config.path}`;
    const that = this;

    console.info('Initializing channel list from config files.');

    /*
    * Define a queue to avoid too channel registrations at the same time.
    */
    const queue = async.queue(function(data, callback) {
      that.registerChannels(data.data, callback);
    }, config.channels);
    queue.drain = callback;

    /*
    * As soon as we read a config file for MumuDVB, we parse it for our router and
    * we load the channels list from it.
    */
    fs.readdirSync(path).forEach((file) => {
      const configFile = path + '/' + file;
      const configContent = ini.parse(fs.readFileSync(configFile, 'utf-8'));
      const data = {
        port: configContent.port_http,
        configFile,
      };
      queue.push({ data });
    });
  },

  /**
   * Returns current status of router
   */
  getStatus() {
    return {
      config: this.config,
      channels: this.servers
    };
  },

  /**
   * On new request, create or reuse the related MumuDVB instance
   *
   * @param {object} request from Hapi
   * @param {function} callback
   */
  onConnect(request, callback) {
    const id = parseInt(request.params.id, 10);
    if (typeof this.servers[id] === 'undefined') {
      return callback('Unregistered channel');
    }

    manager.linkCard(this.servers[id], (err, data) => {
      if (err) {
        return callback(err);
      }
      return callback(null, Object.assign({}, data, { channel: this.servers[id] }));
    });
  },

  /**
   * Generate m3u file from channels list
   *
   * @param {string} protocol
   * @param {string} baseUrl
   */
  buildPlaylist(protocol, baseUrl) {
    let content = '#EXTM3U\n';
    // Order by channel number, like on TV
    Object.values(this.servers)
      .sort((a, b) => (a.lcn > b.lcn) ? 1 : -1)
      .forEach(function(channel) {
        content += `#EXTINF:0,${channel.name}\n`;
        content += `${protocol}://${baseUrl}/stream/${channel.service_id}\n`;
      });
    return content;
  },

  registerChannels(data, callback) {
    const that = this;

    async.retry({ times: 10, interval: 1000 }, function(clbk) {
      manager.linkCard(data, clbk);
    }, function(err, resp) {
      if (err) {
        return callback(err);
      }

      // Harcoded 127.0.0.1 because we run the MumuDVB processes on the same machine
      const channelUrl = `http://127.0.0.1:${resp.port}/channels_list.json`;
      Request.get(channelUrl, function (err3, res) {
        if (err3) {
          manager.closeCard(resp.port);
          if (callback) {
            return callback(err3);
          }
        }

        // Get from JSON and filter unwanted channels
        const length = that.filters.length;
        const channels = JSON.parse(res.body).filter(function(channel) {
          for(var i = 0; i < length; i++) {
            if (channel.name.indexOf(that.filters[i]) !== -1) {
              console.log(`- Filtered ${channel.name}`);
              return false;
            }
          };
          return true;
        });

        channels.forEach(function(channel) {
          console.log(`- Register ${channel.name} on port ${resp.port} (id ${channel.service_id})`);
          that.servers[channel.service_id] = Object.assign({}, resp, channel);
        });
        manager.closeCard(resp.port, callback);
      });
    });
  },
}

export default router;
