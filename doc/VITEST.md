# Vitest Test Data

This package supports collecting the test data of projects that are using Vitest 4 or later (tested on 5.0.3). The reporter uses the `onTestRunEnd` reporter API, so it sends nothing on Vitest 0.x.

## Usage

### Basic usage

Add the following to your `vitest.config.js` file:

```javascript
import VitestTestDataPlugin from 'agoda-test-metrics/vitest';

export default defineConfig({
  // ... your other config ...
  test: {
    // ... your other test config ...
    reporters: ['default', new VitestTestDataPlugin()],
  },
});
```

Don't forget to keep the `'default'` reporter in the list, otherwise you won't be able to see your test result in the console.

### Advanced usage

The command that you used to run the tests, like `yarn test`, is sent as a custom identifier. In most cases that is enough to tell different test configurations apart.

However, if you would like to define your own identifier, you can do so by passing it as a parameter to the plugin.

```javascript
new VitestTestDataPlugin(testOnlyPartA ? 'test-only-part-a' : 'test-everything');
```

## Configuration

| Default                               | Environment Variable Override |
| ------------------------------------- | ----------------------------- |
| "<http://compilation-metrics/vitest>" | VITEST_METRICS_ENDPOINT       |

The override is the full URL. `BUILD_METRICS_ES_ENDPOINT` is not read.

If `DEVFEEDBACK_TEST_TOKEN` is set and not blank, its value is sent in the `X-DevFeedback-Token` header. Otherwise no header is sent. The token is never logged.

The report is sent once per test run, when the run ends. A failed send never fails or stops the run.

When sending fails, the error is written to `devfeedback.log` in your current working directory. You might want to add this file to `.gitignore`.
