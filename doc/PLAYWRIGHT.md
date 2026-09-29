# Playwright Test Data

This package supports collecting the test data of projects that are using Playwright.

## Usage

The reporter posts the JUnit XML file that Playwright's own `junit` reporter writes, so you need both reporters in your `playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  // ... your other config ...
  reporter: [
    ['list'],
    ['junit', { outputFile: 'results.xml' }],
    ['agoda-test-metrics/playwright'],
  ],
});
```

If the `junit` reporter is not configured, the reporter logs a message and skips sending.

There is a complete sample config in [playwright.config.ts](playwright.config.ts).

## Configuration

| Default                                       | Environment Variable Override |
| --------------------------------------------- | ----------------------------- |
| "<http://compilation-metrics/testdata/junit>" | BUILD_METRICS_ES_ENDPOINT     |
