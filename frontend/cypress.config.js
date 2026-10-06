import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "https://innervoice.salehaimtiaz.com",

    specPattern: "cypress/e2e/**/*.cy.js",

    supportFile: "cypress/support/e2e.js",

    setupNodeEvents(on, config) {
      return config;
    },
  },

  viewportWidth: 1440,
  viewportHeight: 900,

  defaultCommandTimeout: 10000,
  requestTimeout: 15000,
  responseTimeout: 20000,
  pageLoadTimeout: 60000,

  retries: {
    runMode: 1,
    openMode: 0,
  },

  screenshotOnRunFailure: true,
  video: true,
});