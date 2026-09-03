const { defineConfig } = require('playwright/test');

module.exports = defineConfig({
  use: {
    launchOptions: {
      executablePath: '/usr/bin/chromium',
    },
  },
});
