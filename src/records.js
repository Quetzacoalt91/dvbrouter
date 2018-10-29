import fs from 'fs';
import { spawn } from 'child_process';

/**
 * TODO
 * * Get current project url
 * * match channel name with id
 */
class Records {
  plannedRecords = [];
  destinationPath = null;
  url = null;
  router = null;

  init(config, router) {
    this.destinationPath = config.destPath;
    this.router = router;
  }

  setServerUrl(url) {
    this.url = url;
  }

  list() {
    return {
      schedule: this.plannedRecords,
      records: fs.readdirSync(this.destinationPath),
    };
  }

  add(data) {
    if (!data.channel
      || !data.from
      || !data.duration) {
        return {
          error: "Missing information"
        };
    }

    const newData = Object.assign({}, data, {
      channelId: this.findIdFromChannelName(data.channel)
    });

    if (!newData.channelId) {
      return {
        error: "Channel cannot be found"
      };
    }

    this.plannedRecords.push(Object.assign({}, newData));
    return this.list();
  }

  delete(index) {
    this.plannedRecords.splice(index, 1);
    return this.list();
  }

  checkAndStart() {
    const now = (new Date()).getTime();
    console.log(`Checking schedule at ${now}...`);
    this.plannedRecords.forEach((record, index) => {
      if (now >= record.from) {
        console.log('Starting record on '
          + record.channel
          + ' for '
          + record.duration
          + ' minutes');

        this.delete(index);
        // Start ffmpeg process for recording
        const args = [
          '-i', this.url + '/stream/' + record.channelId,
          '-t', 60 * record.duration,
          '-c', 'copy', this.destinationPath+record.from+'.mp4'];
        spawn('ffmpeg', args);
      }
    });
  }

  /**
   * There is no corellation between Freeview and the channel list
   * from the DVB device. We need to link channels with their name
   * @param {string} name 
   */
  findIdFromChannelName(name) {
    const channels = this.router.getStatus().channels;

    // 1- Check strict equality
    for (let objectKey of Object.keys(channels)) {
      var channel = channels[objectKey];
      if (channel.name.toUpperCase() === name.toUpperCase()) {
        return objectKey;
      }
    }

    // 2- Check string is included
    for (let objectKey of Object.keys(channels)) {
      var channel = channels[objectKey];
      if (channel.name.includes(name)) {
        return objectKey;
      }
    };
  }
}

export default Records;
