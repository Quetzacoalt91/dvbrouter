import { spawnSync } from 'child_process';
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
  // If already opened
  manager.instances.forEach(function(instance, index) {
    if (!that.isOpenSlot(index) && instance.port === data.port) {
      return callback(null, instance);
    }
  });

  const slot = manager.findOpenSlot();
  // or if no slot available
  if (slot === false) {
    return callback('No more slots available!', null);
  }

  // reserve it!
  manager.instances[slot] = { port: 0 };

  // spawn new instance
  const args = ['--card', slot, '-c', data.configFile];
  const process = spawnSync(manager.command, args);
  if (process.status) {
    throw new Error(process.stderr);
  }
  const newInstance = {
    args: args.join(' '),
    port: data.port,
    configFile: data.configFile,
  };

  manager.instances[slot] = newInstance;
  setTimeout(function() { callback(null, newInstance); }, 5000);
  return newInstance;
}

export function closeProcess(args) {
  const query = { command: manager.command };
  if (typeof args !== 'undefined') {
    query.arguments = args;
  }
  ps.lookup(query, function(err, resultList) {
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
    // If used slop and related to the port to free
    if (!manager.isOpenSlot(i) && manager.instances[i].port === data.port) {
      closeProcess(manager.instances[i].configFile);
      manager.instances[i] = null;
    }
  }
}

export default manager;
