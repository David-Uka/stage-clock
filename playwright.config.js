// Runs the app from a static server and drives it with Chromium.
// Locally it uses the installed Google Chrome when PW_CHROME=1 (no browser download needed).
const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: 'tests',
  timeout: 60000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:8123',
    channel: process.env.PW_CHROME ? 'chrome' : undefined,
  },
  webServer: {
    command: 'python3 -m http.server 8123 --bind 127.0.0.1',
    url: 'http://127.0.0.1:8123/index.html',
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
  },
});
