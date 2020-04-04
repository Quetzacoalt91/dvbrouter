import { spawn } from 'child_process';
import ps from 'ps-node';
import Request from 'request';
import http from 'http';

const manager = {
  allowedInstances: 0,
  instances: [],
  command: '/usr/bin/mumudvb',

  findOpenSlot: () => {
    for (let i = 0; i < manager.allowedInstances; i++) {
      if (manager.isOpenSlot(i)) {
        return i;
      }
    }
    return false;
  },

  isOpenSlot: (i) => {
    return (manager.instances[i] === null
      || typeof manager.instances[i] === 'undefined');
  },

  /**
   * Get MumuDVB status and checks clients are still connected
   */
  closeIfNoClients: (port) => {
    console.log('Checking clients of instance '+ port);
    const options = {
      host: '127.0.0.1',
      port,
      path: '/channels_list.json',
    };

    http.get(options, function(res) {
      res.on('data', function(chunk) {
        let channelsWithClients = [];
        try {
          channelsWithClients = JSON.parse(chunk).filter(function(channel) {
            // We check the client at row 0, which always exist.
            // If nobody is connected, its value is an empty object and thus must be filtered
            return !(Object.keys(channel.clients[0]).length === 0
              && channel.clients[0].constructor === Object);
          });
        } catch (e) {
          console.log('Error while checking status: ' + e);
        }

        // No client ? close
        if (channelsWithClients.length === 0) {
          methods.closeCard(port);
        }
      });
    }).on('error', function(e) {
      if ('ECONNRESET' !== e.code) {
        console.log('Error while checking status: ' + e.message);
        return false;
      }
    }).end();
  },
};

const methods = {
  initManager: (config) => {
    manager.allowedInstances = config.channels;
  },

  /**
   * For all opened instances, check there are still connected clients,
   * close them is nobody use the service anymore
   */
  checkOpenedInstances: () => {
    const that = manager;
    manager.instances.forEach(function(instance, index) {
      // Check only fully started instance
      if (!that.isOpenSlot(index)
          && instance.process !== undefined) {
        that.closeIfNoClients(instance.port);
      }
    });
  },

  linkCard: (data, callback) => {
    const that = manager;
    let slot = false;
    // If already opened
    manager.instances.forEach(function(instance, index) {
      if (!that.isOpenSlot(index) && instance.port === data.port) {
        slot = index;
      }
    });
    if (slot !== false) {
      return callback(null, manager.instances[slot]);
    }

    slot = manager.findOpenSlot();
    // or if no slot available
    if (slot === false) {
      return callback('No more slots available!', null);
    }

    // reserve it!
    manager.instances[slot] = { port: data.port };

    // spawn new instance
    console.info('Starting MumuDVB instance on slot #' + slot +' for port '+ data.port);
    const args = ['--card', slot, '-c', data.configFile, '-d'];
    const process = spawn(manager.command, args);
    process.ready = false;
    process.on('error', (err) => {
      manager.instances[slot] = null;
      console.error('Failed to start MumuDVB instance.');
      return callback('Failed to start MumuDVB instance.');
    });
    process.on('close', (code) => {
      manager.instances[slot] = null;
      if (code !== 0 && code !== null) {
        const err = `mumudvb process exited with code ${code}`;
        console.error(err);
        return callback(err);
      }
    });
    process.stderr.on('data', (message) => {
      if (!process.ready &&
        (message.indexOf('Autoconfiguration done') !== -1 ||
        message.indexOf('Channel accessible') !== -1)) {
        process.ready = true;
        const newInstance = {
          process,
          port: parseInt(data.port, 10),
          configFile: data.configFile,
        };

        manager.instances[slot] = newInstance;
        return callback(null, newInstance);
      }
    });
  },

  closeProcess: () => {
    ps.lookup({ command: manager.command }, function(err, resultList) {
      if (err) {
        throw new Error(err);
      }

      resultList.forEach(function (process) {
        if (process) {
          ps.kill(process.pid, 'SIGKILL', function(){});
        }
      });
    });
  },

  closeCard: (port, callback) => {
    port = parseInt(port, 10);
    console.log('Request closing of port '+ port);
    const len = manager.allowedInstances;
    for (let i = 0; i < len; i++) {
      // If used slot and related to the port to free
      if (!manager.isOpenSlot(i) && manager.instances[i].port === port) {
        if (manager.instances[i].process) {
          manager.instances[i].process.kill('SIGKILL');
        }
        manager.instances[i] = null;
      }
    }
    if (callback) {
      setTimeout(callback, 500);
    }
  },
};

export default methods;
