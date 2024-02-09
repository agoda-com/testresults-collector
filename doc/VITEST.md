# Vitest Test Data

This package also supports collecting the test data of projects that are using Vitest (0.x).

## Usage

### Basic usage

#### Vitest

If you use **Vitest**, you can add the following to your `vitest.config.js` file:

```javascript
import { VitestTestDataPlugin } from '@agoda-com/test-metrics'

export default defineConfig({
  ...,
  test: {
    ...,
    reporters: ['default', new VitestTestDataPlugin()],
  },
})
```

Don't forget to keep `'default'` reporter in the list, otherwise you won't be able to see your test result in the console.

### Advanced usage

As same as build time, test data collection also sends the command that you used to run the build like `yarn test` to be the custom identifier which should work in most cases in order to help you distinguish between different test configurations.

However, if you would like to define your own identifier, you can do so by passing it as a parameter to the plugin.

```javascript
VitestTestDataPlugin(testOnlyPartA ? 'test-only-part-a' : 'test-everything');
```
