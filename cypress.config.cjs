const { defineConfig } = require('cypress');

module.exports = defineConfig({
  video: true,
  screenshotOnRunFailure: true,
  trashAssetsBeforeRuns: false,
  screenshotsFolder: 'reports/qa-evidence/cypress/screenshots',
  videosFolder: 'reports/qa-evidence/cypress/videos',
  defaultCommandTimeout: 10000,
  viewportWidth: 1440,
  viewportHeight: 900,
  e2e: {
    baseUrl: process.env.QA_WEB_URL || 'http://127.0.0.1:5173',
    specPattern: 'tests/cypress/e2e/**/*.cy.js',
    supportFile: false,
  },
});
