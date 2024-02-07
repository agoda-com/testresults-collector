import type { PlaywrightTestConfig, ReporterDescription } from '@playwright/test';
import { devices } from '@playwright/test';
import * as path from 'path';
// import dotenv from 'dotenv';

const junit: ReporterDescription = [
  'junit',
  {
    outputFile: process.env.PLAYWRIGHT_JUNIT_OUTPUT_NAME
        ? path.join(__dirname,process.env.PLAYWRIGHT_JUNIT_OUTPUT_NAME)
        : path.join(__dirname,'playwright-report/junit.results.xml')
  }
]
const testMetrics: ReporterDescription = ['@agoda-com/test-metrics/playwright']
/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// dotenv.config({ path: './playwright.env' });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
const config: PlaywrightTestConfig = {
  /* Test directory to execute */
  testDir: './src',

  /* Maximum time one test can run for. */
  timeout: 2 * 60 * 1000,

  /* Maximum time all tests can run for. */
  globalTimeout: 60 * 60 * 1000,

  expect: {
    /**
     * Maximum time expect() should wait for the condition to be met.
     * For example in `await expect(locator).toHaveText();`
     */
    timeout: 5000,

    toMatchSnapshot: {
      threshold: 0.3,
      maxDiffPixels: 200,
      maxDiffPixelRatio: 0.2,
    }
  },

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI && !process.env.CI_FLAKY_DETECTOR ? 3 : 0,

  /* Limit the number of failures on CI to save resources */
  maxFailures: process.env.CI ? 10 : undefined,

  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI ? [
    ['html', { open: 'never',outputFolder:process.env.PLAYWRIGHT_HTML_REPORT? process.env.PLAYWRIGHT_HTML_REPORT: 'playwright-report/index.html' }],
    junit,testMetrics ] : [['list'],junit,testMetrics],

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Maximum time each action such as `click()` can take. Defaults to 0 (no limit). */
    actionTimeout: 0,
    /* Base URL to use in actions like `await page.goto('/')`. */
    // baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'retain-on-failure',

    ignoreHTTPSErrors: true,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'screenshot',
      testDir: './src/visualTesting/tests/',
      /* Maximum time one test can run for. */
      timeout: 60 * 1000,
      expect: {
        /**
         * Maximum time expect() should wait for the condition to be met.
         * For example in `await expect(locator).toHaveText();`
         */
        timeout: 10000,
        toMatchSnapshot: {
          threshold: 0.3,
          maxDiffPixels: 200,
          maxDiffPixelRatio: 0.2,
        }
      },
      retries: process.env.CI ? 3 : 0,
      metadata: {
        deviceName: 'Desktop Chrome',
      },
      use: {
        ...devices['Desktop Chrome'],
      },

    }
  ],
  snapshotPathTemplate: '{testDir}/{testFileDir}/__screenshots__/{arg}{ext}',
};

export default config;
