import { getCommonMetadata } from './common';
import { postTestData, LOG_FILE } from '../common/transport';
import { v1 as uuidv1 } from 'uuid';
import type { Reporter, Vitest, TestModule, TestCase } from 'vitest/node';
import type { VitestStatus, VitestTestFile, VitestTestCase, VitestTestData } from './types';

const testCaseStatus = (testCase: TestCase): VitestStatus => {
  switch (testCase.result().state) {
    case 'passed':
      return 'pass';
    case 'failed':
      return 'fail';
    case 'skipped':
      return testCase.options.mode === 'todo' ? 'todo' : 'skip';
    case 'pending':
      return 'run';
  }
};

const testModuleStatus = (testModule: TestModule): VitestStatus => {
  switch (testModule.state()) {
    case 'passed':
      return 'pass';
    case 'failed':
      return 'fail';
    case 'skipped':
      return 'skip';
    case 'pending':
    case 'queued':
      return 'run';
  }
};

const toTestCase = (testCase: TestCase): VitestTestCase => {
  const errors = testCase.result().errors ?? [];
  const diagnostic = testCase.diagnostic();
  return {
    name: testCase.fullName,
    status: testCaseStatus(testCase),
    errorMessage: errors.length === 0 ? null : errors.map((e) => e.message),
    // Tests that did not run (skipped, todo) have no diagnostic.
    startTime: diagnostic?.startTime ?? 0,
    duration: diagnostic?.duration ?? 0,
    filename: testCase.module.relativeModuleId,
  };
};

export default class VitestTestDataPlugin implements Reporter {
  private ctx!: Vitest;
  private readonly customIdentifier: string | undefined;

  constructor(customIdentifier: string | undefined = process.env.npm_lifecycle_event) {
    this.customIdentifier = customIdentifier;
  }

  onInit(ctx: Vitest) {
    this.ctx = ctx;
  }

  async onTestRunEnd(testModules: ReadonlyArray<TestModule>) {
    const config = this.ctx.config;

    const testfiles: VitestTestFile[] = [];
    const testcases: VitestTestCase[] = [];

    for (const testModule of testModules) {
      const diagnostic = testModule.diagnostic();
      const moduleTestcases = Array.from(testModule.children.allTests(), toTestCase);
      // The module API has no start time, so the module starts with its first test.
      const startTimes = moduleTestcases.map((t) => t.startTime).filter((t) => t > 0);

      testfiles.push({
        name: testModule.relativeModuleId,
        collectDuration: diagnostic.collectDuration,
        setupDuration: diagnostic.setupDuration,
        prepareDuration: diagnostic.prepareDuration,
        environmentLoad: diagnostic.environmentSetupDuration,
        status: testModuleStatus(testModule),
        startTime: startTimes.length === 0 ? 0 : Math.min(...startTimes),
        duration: diagnostic.duration,
      });
      testcases.push(...moduleTestcases);
    }

    const timeTaken = testfiles.reduce((acc, file) => acc + file.duration, 0);
    const testData: VitestTestData = {
      ...getCommonMetadata(timeTaken, this.customIdentifier),
      type: 'vitest',
      vitestVersion: this.ctx.version,
      mode: config.mode,
      maxConcurrency: config.maxConcurrency,
      watchMode: config.watch,
      testEnvironment: config.environment,
      runId: uuidv1(),
      files: testfiles,
      testcases,
    };

    console.log(`Your test time was ${timeTaken.toFixed(2)}ms.`);
    const sent = await postTestData('vitest', testData);
    if (sent) {
      console.log('Your test data has successfully been sent.');
    } else {
      console.log(`Your test data has not been sent. See logs in ${LOG_FILE} for more info.`);
    }
  }
}
