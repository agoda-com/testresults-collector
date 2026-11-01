import { defineConfig } from 'vitest/config';
import VitestTestDataPlugin from '../../../vitest/VitestTestDataPlugin';

// Fixture project for ../VitestReporter.realRun.spec.ts: loads
// the reporter from source, as a consumer's config would load the package.
export default defineConfig({
  test: {
    reporters: ['default', new VitestTestDataPlugin('vitest-fixture')],
  },
});
