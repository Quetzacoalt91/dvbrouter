import fs from 'fs';

class router {
  config = {};

  init = function (config) {
    this.config = config;

    fs.readdirSync(this.config.path).forEach((file) => {
      console.log(file);
    });
  };
}

export default router;
