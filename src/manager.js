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
  manager.instances[slot] = { port: 0 };

  // spawn new instance
  const args = ['--card', slot, '-c', data.configFile, '-d'];
  const process = spawn(manager.command, args);
  process.on('error', (err) => {
    console.error('Failed to start MumuDVB instance.');
    return callback(err);
  });
  process.on('close', (code) => {
    manager.instances[slot] = null;
    if (code !== 0) {
      return callback(`mumudvb process exited with code ${code}`);
    }
  });
  process.stderr.on('data', (message) => {
    if (message.indexOf('Autoconfiguration done') !== -1) {
      const newInstance = {
        process,
        port: parseInt(data.port, 10),
        configFile: data.configFile,
      };

      manager.instances[slot] = newInstance;
      callback(null, newInstance);
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
        ps.kill(process.pid, 'SIGTERM', function(){});
      }
    });
  });
}

export function closeCard(data) {
  console.log('Request closing of port '+ data.port);
  const len = manager.allowedInstances;
  for (let i = 0; i < len; i++) {
    // If used slot and related to the port to free
    if (!manager.isOpenSlot(i) && manager.instances[i].port === data.port) {
      manager.instances[i].process.kill();
      manager.instances[i] = null;
    }
  }
}

export default manager;
