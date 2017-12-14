import { spawn } from 'child_process';
import ps from 'ps-node';

function manager() {
}
manager.allowedInstances = 0;
manager.instances = [];
manager.command = '/usr/bin/mumudvb';

manager.findOpenSlot = () => {
  for (let i = 0; i < manager.allowedInstances; i++) {
    if (manager.isOpenSlot(i)) {
      return i;
    }
  }
  return false;
}

manager.isOpenSlot = (i) => {
  return (manager.instances[i] === null
    || typeof manager.instances[i] === 'undefined');
}

export function initManager(config) {
  manager.allowedInstances = config.channels;
}

export function linkCard(data, callback) {
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
    if (code !== 0) {
      console.error(`mumudvb process exited with code ${code}`);
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
}

export function closeProcess() {
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
}

export function closeCard(port, callback) {
  port = parseInt(port, 10);
  console.log('Request closing of port '+ port);
  const len = manager.allowedInstances;
  for (let i = 0; i < len; i++) {
    // If used slot and related to the port to free
    if (!manager.isOpenSlot(i) && manager.instances[i].port === port) {
      if (manager.instances[i].process) {
        manager.instances[i].process.kill('SIGINT');
      }
      manager.instances[i] = null;
    }
  }
  if (callback) {
    setTimeout(callback, 500);
  }
}

export default manager;
