import { defineConfig } from 'cypress'

// Run from the repository root:
//   npx cypress run --config-file tests/cypress/cypress.config.ts
// or, in Jenkins, with the cypress/included image.
export default defineConfig({
  screenshotsFolder: 'reports/cypress/screenshots',
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://127.0.0.1:8080',
    specPattern: 'tests/cypress/e2e/**/*.cy.ts',
    supportFile: false,
    video: false,
    screenshotOnRunFailure: true,
  },
})
