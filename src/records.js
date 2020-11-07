import fs from 'fs';
import { spawn } from 'child_process';

/**
 * TODO
 * * Get current project url
 * * match channel name with id
 */
const records = {
  plannedRecords: [],
  destinationPath: null,
  url: null,
  router: null,
};

export default {
  init(config, router) {
    records.destinationPath = config.destPath;
    records.router = router;
  },

  setServerUrl(url) {
    records.url = url;
  },

  list() {
    fs.access(records.destinationPath, fs.constants.R_OK, (err) => {
      if (err) {
        return {
          error: "Directory does not exist or can't be read.",
        };
      }
      return {
        schedule: records.plannedRecords,
        records: fs.readdirSync(records.destinationPath).map(function(filename) {
          return {
            filename,
            metadata: {},
          }
        }),
      };
    });
  },

  add(data) {
    if (!data.channel
      || !data.from
      || !data.duration) {
        return {
          error: "Missing information"
        };
    }

    const metadata = data.metadata || {};
    metadata.channel = data.channel; // Copy channel name in metadata

    const newData = Object.assign({}, data, {
      metadata,
      channelId: this.findIdFromChannelName(data.channel)
    });

    if (!newData.channelId) {
      return {
        error: "Channel cannot be found"
      };
    }

    records.plannedRecords.push(Object.assign({}, newData));
    return this.list();
  },

  delete(index) {
    records.plannedRecords.splice(index, 1);
    return this.list();
  },

  checkAndStart() {
    const now = (new Date()).getTime();
    //console.log(`Checking schedule at ${now}...`);
    records.plannedRecords.forEach((record, index) => {
      if (now >= record.from) {
        console.log('Starting record on '
          + record.channel
          + ' for '
          + record.duration
          + ' minutes');

        this.delete(index);

        // Start ffmpeg process for recording
        const args = [
          '-i', records.url + '/stream/' + record.channelId
        ];
        // Create array with metadata params
        Object.keys(record.metadata).map(function(objectKey, index) {
          var value = record.metadata[objectKey];
          if (typeof value === 'string' || typeof value === 'number') {
            args.push('-metadata', `${objectKey}=${JSON.stringify(value)}`);
          }
        });

        args.push(
          '-t', 60 * record.duration,
          '-map', '0:v:0', // Filter first video stream
          '-map', '0:a:0', // Filter first audio stream
          '-map', '0:s:0', // Filter first subtitle stream
          '-c', 'copy', // Copy all
          '-scodec', 'dvdsub', // Trancode subtitle to dvd
          records.destinationPath+record.from+'.mp4',
        );

        console.log('FFmpeg args:', args);

        const subprocess = spawn('ffmpeg', args, {
          detached: true,
          stdio: 'ignore'
        });
        subprocess.unref();
      }
    });
  },

  /**
   * There is no corellation between Freeview and the channel list
   * from the DVB device. We need to link channels with their name
   * @param {string} name 
   */
  findIdFromChannelName(name) {
    const channels = records.router.getStatus().channels;

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
};
