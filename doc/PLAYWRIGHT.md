# Playwright Test Data

This package supports collecting the test data of projects that are using Playwright.

## Usage

Add the reporter to your `playwright.config.ts`. It needs no other reporter: it collects every test attempt itself and posts one JSON report when the run ends.

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  // ... your other config ...
  reporter: [
    ['list'],
    ['agoda-test-metrics/playwright'],
  ],
});
```

Playwright component tests (`@playwright/experimental-ct-react` and the other `experimental-ct-*` packages) take the same reporter entry in their `playwright-ct.config.ts`.

There is a complete sample config in [playwright.config.ts](playwright.config.ts).

## What is sent

One report per run, with one `testcases` entry per attempt. A test that fails and then passes on retry is sent twice (`retry` 0 and 1), so flaky tests show up. Each entry has the test's `name`, `fullName` (file and describe titles), `file` (relative to the config file), `project`, `status` (`passed`, `failed`, `timedOut`, `skipped` or `interrupted`), `retry`, `duration`, `startTime` and `errorMessage`.

Sending never fails or slows the run beyond a 10 second timeout. If the report cannot be sent, the error is written to `devfeedback.log`.

## Configuration

| Default                                  | Environment Variable Override |
| ---------------------------------------- | ----------------------------- |
| "<http://compilation-metrics/playwright>" | PLAYWRIGHT_METRICS_ENDPOINT   |

If `DEVFEEDBACK_TEST_TOKEN` is set, its value is sent in the `X-DevFeedback-Token` header.
