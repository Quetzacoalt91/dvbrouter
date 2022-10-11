import { readdirSync, readFileSync } from 'fs';
import { parse } from 'ini';
import { isAbsolute } from 'path';

import ProcessManager, { Instance } from './process-manager';
import { queue, retry } from 'async';
import { DvbConfig } from './types/config';
import { Channel, InitData } from './types/router';

import { getChannelsList, getEit } from './mumudvb';
import EitFormatter from './eit-formatter';


class Router {
  private channels: Map<number, Channel>;
  private filters: string[] = [];

  /**
   * Get all details from config file, then find all mumudvb instances
   * available in given path before running them for channels list
   */
  public constructor(
    private config: DvbConfig,
    private manager: ProcessManager,
    private eitFormatter: EitFormatter,
  ) {
    this.filters = this.config.filters;
    this.channels = new Map<number, Channel&Instance>
  }
    
  public async init() {
    console.info('Initializing channel list from config files.');
    this.channels.clear();
    this.eitFormatter.reset();

    /*
     * Define a queue to avoid too channel registrations at the same time.
     */
    const muxQueue = queue(async (data: InitData, done) => {
      try {
        await this.registerChannels(data);
        done();
      } catch (err:any) {
        done(err);
      }
    }, this.config.channels);

    /*
    * As soon as we read a config file for MumuDVB, we parse it for our router and
    * we load the channels list from it.
    */
    const path = isAbsolute(this.config.path) ? this.config.path : `${__dirname}/${this.config.path}`;

    console.debug(`Reading files in ${path}`);
    readdirSync(path).forEach(async (file: string) => {
      const configFile = path + '/' + file;
      const configContent = parse(readFileSync(configFile, 'utf-8'));
      const data = {
        port: configContent.port_http,
        configFile,
      };
      console.debug(`Will init port ${data.port} with config file ${data.configFile}`);
      await muxQueue.push(data);
    });

    await muxQueue.drain();

    this.manager.setQuickStartOfMumudvbInstances(true);
  }

  /**
   * Returns current status of router
   */
  getStatus() {
    return {
      config: this.config,
      channels: Array.from(this.channels.values())
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
    const resp: Instance = await retry({ times: 3, interval: 2000 }, async () => {
      return await this.manager.startInstance(initData);
    })

    const [data, eit] = await Promise.all([
      getChannelsList(resp.port),
      getEit(resp.port),
    ]);
    
    // ToDo: We could resolve here to let another port to load,
    // while we register the lists we got
    await this.manager.closeInstance(resp.port);

    // Get from JSON and filter unwanted channels
    const length = this.filters.length;
    const channels = data.filter((channel) => {
      for(var i = 0; i < length; i++) {
        if (channel.name.indexOf(this.filters[i]) !== -1) {
          console.log(`- Filtered ${channel.name}`);
          return false;
        }
      };
      return true;
    });

    channels.forEach((channel) => {
      console.log(`- Register ${channel.name} on port ${resp.port} (id ${channel.service_id})`);
      this.channels.set(channel.service_id, {...resp, ...channel});
    });

    this.eitFormatter.addChannels(channels);
    this.eitFormatter.addEitTable(eit.EIT_tables);
  }
}

export default Router;
