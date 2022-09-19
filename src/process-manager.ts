import { spawn } from 'child_process';
import * as child from 'child_process';
import ps from 'ps-node';
import { InitData } from './types/router';
import { ChannelsList } from './types/mumudvb';
import { getChannelsList } from './mumudvb';

export type Instance = {
  port: number,
  configFile: string,
  process?: child.ChildProcess,
};

/**
 * Class responsible of managing processes of MumuDVB
 */
class ProcessManager {
  private instances: (Instance|null)[] = [];
  private quickStart: boolean = false;
  private static readonly command = '/usr/bin/mumudvb';

  public constructor(
    private allowedInstances = 0,
  ) {}

  /**
   * For all opened instances, check there are still connected clients,
   * close them is nobody use the service anymore
   */
  public findAndCloseUnusedInstances(): void {
    this.instances.forEach((instance, index) => {
      // Check only fully started instance
      if (!this.isOpenSlot(index)
          && instance?.process !== undefined) {
        this.closeIfNoClients(instance.port);
      }
    });
  }

  /**
   * When the channels list is built here, we don't need to wait
   * for the complete start of MumuDvb anymore. We can consider Mumudvb
   * mumudvbIsReady as soon as its channels are detected.
   */
  public setQuickStartOfMumudvbInstances(quickStart: boolean) {
    this.quickStart = quickStart;
  }

  public async startInstance(data: InitData): Promise<Instance> {
    // If already opened
    const existingInstance = this.instances.find((instance, index) => {
      return (this.isOpenSlot(index) && instance?.port === data.port);
    });

    if (existingInstance) {
      return existingInstance;
    }

    const slot = this.findOpenSlot();
    // or if no slot available
    if (slot === false) {
      throw new Error('No more slots available!');
    }

    // reserve it!
    this.instances[slot] = {
      port: data.port,
      configFile: data.configFile,
    };

    try {
      const runningInstance: Instance = await new Promise((resolve, reject) => {
  
        let mumudvbIsReady = false;
  
        // spawn new instance
        console.info('Starting MumuDVB instance on slot #' + slot +' for port '+ data.port);
        const args = ['--card', slot.toString(), '-c', data.configFile, '-d'];
        const process = spawn(ProcessManager.command, args);
        process.on('error', (err) => {
          reject(new Error(`Failed to start MumuDVB instance. ${err}`));
        });
        process.on('close', (code) => {
          if (code !== 0 && code !== null) {
            reject(new Error(`mumudvb process exited with code ${code}`));
          }
        });
        process.stderr.on('data', (message) => {
          if (mumudvbIsReady) {
            return;
          }
          if (this.messageSaysMumudvbIsReady(message)) {
            mumudvbIsReady = true;
            const newInstance = {
              process,
              port: data.port,
              configFile: data.configFile,
            };
    
            resolve(newInstance);
          }
        });
        // After a few seconds, stop the process if Mumudvb has not totally started.
        // This issue occurs for instance when the antenna has some issues.
        setTimeout(() => {
          if (mumudvbIsReady === false) {
            process.kill('SIGKILL');
            reject(new Error('Acknowledgment message never received. Aborting.'));
          }
        }, 30000);
  
      });
      this.instances[slot] = runningInstance;
      return runningInstance;
    }
    catch (err) {
      this.instances[slot] = null;
      console.log(err);
      throw err;
    }

  }

  public static closeRunningProcesses() {
    ps.lookup({ command: this.command }, function(err, resultList) {
      if (err) {
        throw err;
      }

      resultList.forEach(function (process) {
        if (process) {
          ps.kill(process.pid, 'SIGKILL', function(){});
        }
      });
    });
  }

  public async closeInstance(port: number) {
    console.log(`Request closing of port ${port}`);

    for (let i = 0; i < this.allowedInstances; i++) {
      // If used slot and related to the port to free
      // ToDo: Check no other channel is used
      if (!this.isOpenSlot(i) && this.instances[i]?.port === port) {
        this.instances[i]?.process?.kill('SIGKILL');
        this.instances[i] = null;
      }
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  public findOpenSlot() {
    for (let i = 0; i < this.allowedInstances; i++) {
      if (this.isOpenSlot(i)) {
        return i;
      }
    }
    return false;
  }

  private isOpenSlot(i: number): boolean {
    return !!this.instances[i];
  }

  /**
   * Get MumuDVB status and checks clients are still connected
   */
  private async closeIfNoClients(port: number) {
    console.log(`Checking clients of instance ${port}`);
    const data: ChannelsList = await getChannelsList(port);

    try {
      const channelsWithClients = data.filter(function(channel) {
        // We check the client at row 0, which always exist.
        // If nobody is connected, its value is an empty object and thus must be filtered
        return !(Object.keys(channel.clients[0]).length === 0
          && channel.clients[0].constructor === Object);
      });
      // No client ? close
      if (channelsWithClients.length === 0) {
        this.closeInstance(port);
      }
    } catch (e) {
      console.log('Error while checking status: ' + e);
      this.closeInstance(port);
    }
  }

  private messageSaysMumudvbIsReady(message: string): boolean {
    if (this.quickStart && (
      message.indexOf('Looking through all channels') !== -1 ||
      message.indexOf('Autoconfiguration done') !== -1 ||
      message.indexOf('Channel accessible') !== -1)
    ) {
      return true;
    }

    // If we wait for the complete startup, channel numbers must be set
    return message.indexOf('We got the NIT, we update the channel names') !== -1;
  }
};

export default ProcessManager;
