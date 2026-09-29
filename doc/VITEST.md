# Vitest Test Data

This package supports collecting the test data of projects that are using Vitest (0.x).

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
| "<http://compilation-metrics/vitest>" | BUILD_METRICS_ES_ENDPOINT     |

When sending fails, the error is written to `devfeedback.log` in your current working directory. You might want to add this file to `.gitignore`.
