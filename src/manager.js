import { spawnSync } from 'child_process';
import ps from 'ps-node';

class DvbManager {
  allowedInstances = 0;
  instances = [];
  command = '/usr/bin/mumudvb';

  constructor(config) {
    this.allowedInstances = config.channels;
    this.closeProcess();
  }

  linkCard(data, callback) {
    const that = this;
    // If already opened
    this.instances.forEach(function(instance, index) {
      if (!that.isOpenSlot(index) && instance.port === data.port) {
        return callback(null, instance);
      }
    });

    // or if no slot available
    if (this.instances.length >= this.allowedInstances) {
      return callback('No more slots available!', null);
    }

    // spawn new instance
    const slot = this.findOpenSlot();
    const args = ['--card', slot, '-c', data.configFile];
    const process = spawnSync(this.command, args);
    if (process.status) {
      throw new Error(process.stderr);
    }
    const newInstance = {
      command: this.command + ' ' + args.join(' '),
      port: data.port,
    };

    this.instances[slot] = newInstance;
    setTimeout(function() { callback(null, newInstance); }, 5000);
    return newInstance;
  }

  closeCard(data) {
    console.log('Request closing of port '+ data.port);
    console.log(this.instances);
    const len = this.allowedInstances;
    for (let i = 0; i < len; i++) {
      // If used slop and related to the port to free
      if (!this.isOpenSlot(i) && this.instances[i].port === data.port) {
        this.closeProcess(this.instances[i].command);
        this.instances[i] = null;
      }
    }
  }


  findOpenSlot() {
    for (let i = 0; i < this.allowedInstances; i++) {
      if (this.isOpenSlot(i)) {
        return i;
      }
    }
    return false;
  }

  isOpenSlot(i) {
    return (this.instances[i] === null
      || typeof this.instances[i] === 'undefined');
  }

  closeProcess(args) {
    console.log('Looking for command to close: '+ ((typeof args !== 'undefined') ? args : this.command));
    ps.lookup({
      command: (typeof args !== 'undefined') ? args : this.command,
    }, function(err, resultList) {
      if (err) {
        throw new Error(err);
      }

      resultList.forEach(function (process) {
        if (process) {
          console.log('Send SIGTERM to '+ process.pid);
          ps.kill(process.pid, 'SIGTERM', function(){});
        }
      });
    });
  }
}

export default DvbManager;
