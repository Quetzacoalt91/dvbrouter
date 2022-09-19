import fs from 'fs';
import ini from 'ini';
import { isAbsolute } from 'path';

import ProcessManager, { Instance } from './process-manager';
import { queue, retry } from 'async';
import { DvbConfig } from './types/config';
import { Channel, InitData } from './types/router';

import { ChannelsList } from './types/mumudvb';
import { getChannelsList } from './mumudvb';


class Router {
  private config: DvbConfig;
  private channels: Map<number, Channel>;
  private filters: string[] = [];
  private manager: ProcessManager;

  /**
   * Get all details from config file, then find all mumudvb instances
   * available in given path before running them for channels list
   */
  public constructor(config: DvbConfig) {
    this.manager = new ProcessManager(config.channels);
    this.config = config;
    this.filters = this.config.filters;
    this.channels = new Map<number, Channel&Instance>

    this.init();
  }
    
  public async init() {
    console.info('Initializing channel list from config files.');

    /*
     * Define a queue to avoid too channel registrations at the same time.
     */
    const muxQueue = queue((data: InitData) => {
      this.registerChannels(data);
    }, this.config.channels);

    /*
    * As soon as we read a config file for MumuDVB, we parse it for our router and
    * we load the channels list from it.
    */
    const path = isAbsolute(this.config.path) ? this.config.path : `${__dirname}/${this.config.path}`;

    fs.readdirSync(path).forEach((file) => {
      const configFile = path + '/' + file;
      const configContent = ini.parse(fs.readFileSync(configFile, 'utf-8'));
      const data = {
        port: configContent.port_http,
        configFile,
      };
      muxQueue.push(data);
    });

    await muxQueue.drain();

    this.manager.setQuickStartOfMumudvbInstances(true);
    setInterval(this.manager.findAndCloseUnusedInstances, 10000);
  }

  /**
   * Returns current status of router
   */
  getStatus() {
    return {
      config: this.config,
      channels: Array.from(this.channels.entries())
    };
  }

  /**
   * On new request, create or reuse the related MumuDVB instance
   */
  public async onConnect(channelId: number): Promise<Channel> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error('Unregistered channel');
    }

    const instance = await this.manager.startInstance(channel);
    return {
      ...instance,
      ...channel,
    };
  }

  /**
   * Generate m3u file from channels list
   */
  public buildPlaylist(protocol: string, baseUrl: string): string {
    let content = '#EXTM3U\n';
    // Order by channel number, like on TV
    Array.from(this.channels.values())
      .sort((a, b) => (a.lcn > b.lcn) ? 1 : -1)
      .forEach(function(channel) {
        content += `#EXTINF:0,${channel.name}\n`;
        content += `${protocol}://${baseUrl}/stream/${channel.service_id}\n`;
      });
    return content;
  }

  async registerChannels(initData: InitData) {
    const resp: Instance = await retry({ times: 5, interval: 1000 }, () => {
      return this.manager.startInstance(initData);
    })

    const data: ChannelsList = await getChannelsList(resp.port);
    
    this.manager.closeInstance(resp.port);

    // Get from JSON and filter unwanted channels
    const length = this.filters.length;
    const channels = data.filter(function(channel) {
      for(var i = 0; i < length; i++) {
        if (channel.name.indexOf(this.filters[i]) !== -1) {
          console.log(`- Filtered ${channel.name}`);
          return false;
        }
      };
      return true;
    });

    channels.forEach(function(channel) {
      console.log(`- Register ${channel.name} on port ${resp.port} (id ${channel.service_id})`);
      this.channels.set(channel.service_id, {...resp, ...channel});
    });
    this.manager.closeInstance(resp.port);
  }
}

export default Router;
