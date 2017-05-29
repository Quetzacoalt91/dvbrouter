import fs from 'fs';
import ini from 'ini';
import Request from 'request';

import Manager from './manager';

class router {
  config = {};
  servers = {};
  manager = null;

  init(config) {
    this.manager = new Manager(config);
    this.config = config;
    const path = this.config.path;

    console.info('Initializing channel list from config files.');

    fs.readdirSync(path).forEach((file) => {
      const configFile = path + '/' + file;
      const configContent = ini.parse(fs.readFileSync(configFile, 'utf-8'));
      const data = {
        port: configContent.port_http,
        configFile,
      };
      this.servers = Object.assign({}, this.servers, this.registerChannels(data));
    });
  }

  onConnect(request, callback) {
    const associatedChannel = 0;
    const err = null;

    callback(err, { card: associatedChannel });
  }

  onDisconnect(request) {

  }

  registerChannels(data) {
    const that = this;
    const servers = {};

    this.manager.linkCard(data, (err, data) => {

      const channelUrl = `http://127.0.0.1:${data.port}/channels_list.json`;
      Request.get(channelUrl, function (err, res) {
        if (err) {
          //that.manager.closeCard(data);
          throw new Error(err);
        }
        const channels = JSON.parse(res.body);
        channels.forEach(function(channel) {
          console.log(`Register ${channel.name} on port ${data.port}`);
          servers[channel.service_id] = {
            port: data.port,
            name: channel.name,
          };
        });
        that.manager.closeCard(data);
      });
    });
    return servers;
  }
}

export default router;
