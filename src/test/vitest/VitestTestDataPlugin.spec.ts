import type { CommonMetadata, VitestTestData } from '../../vitest/types';
import VitestTestDataPlugin from '../../vitest/VitestTestDataPlugin';
import { getCommonMetadata } from '../../vitest/common';
import { postTestData } from '../../common/transport';
import type { TestCase, TestModule, Vitest } from 'vitest/node';
import uuid from 'uuid';

jest.mock('uuid', () => ({
  v1: jest.fn(),
}));

jest.mock('../../vitest/common', () => ({
  getCommonMetadata: jest.fn(),
}));

jest.mock('../../common/transport', () => ({
  LOG_FILE: 'devfeedback.log',
  postTestData: jest.fn(),
}));

const mockedUuid = uuid as jest.Mocked<typeof uuid>;
const mockedGetCommonMetadata = getCommonMetadata as jest.MockedFunction<typeof getCommonMetadata>;
const mockedPostTestData = postTestData as jest.MockedFunction<typeof postTestData>;

const mockedVitest = {
  version: '5.0.3',
  config: {
    mode: 'test',
    maxConcurrency: 5,
    watch: false,
    environment: 'jsdom',
  },
} as unknown as Vitest;

const MODULE_ID = 'tests/simple.test.ts';

const testCase = (
  fullName: string,
  state: string,
  options: { mode: string; startTime?: number; duration?: number; errors?: { message: string }[] },
): TestCase => ({
  fullName,
  options: { mode: options.mode },
  module: { relativeModuleId: MODULE_ID },
  result: () => ({ state, errors: options.errors }),
  diagnostic: () => (options.startTime === undefined
    ? undefined
    : { startTime: options.startTime, duration: options.duration }),
}) as unknown as TestCase;

const testCases: TestCase[] = [
  testCase('Simple Test Suite > should pass please', 'passed', { mode: 'run', startTime: 1691053322524, duration: 2 }),
  testCase('Simple Test Suite > should fail', 'failed', {
    mode: 'run', startTime: 1691053322526, duration: 3, errors: [{ message: 'expected 1 to be 2' }],
  }),
  testCase('skipped', 'skipped', { mode: 'skip' }),
  testCase('later', 'skipped', { mode: 'todo' }),
];

const testModule = {
  relativeModuleId: MODULE_ID,
  state: () => 'failed',
  diagnostic: () => ({
    collectDuration: 39,
    setupDuration: 2354,
    prepareDuration: 218.17033398151398,
    environmentSetupDuration: 2834.084042072296,
    duration: 5,
  }),
  children: {
    allTests: function* () {
      yield* testCases;
    },
  },
} as unknown as TestModule;

describe('VitestTestDataPlugin', () => {
  const originalProcessEnv = process.env;

  const expected = {
    type: 'vitest',
    vitestVersion: '5.0.3',
    mode: 'test',
    maxConcurrency: 5,
    watchMode: false,
    testEnvironment: 'jsdom',
    runId: 'this-should-be-a-uuid-but-this-string-is-fine-for-testing',
    files: [
      {
        name: MODULE_ID,
        collectDuration: 39,
        setupDuration: 2354,
        environmentLoad: 2834.084042072296,
        prepareDuration: 218.17033398151398,
        status: 'fail',
        startTime: 1691053322524,
        duration: 5,
      },
    ],
    testcases: [
      {
        name: 'Simple Test Suite > should pass please',
        status: 'pass',
        startTime: 1691053322524,
        duration: 2,
        errorMessage: null,
        filename: MODULE_ID,
      },
      {
        name: 'Simple Test Suite > should fail',
        status: 'fail',
        startTime: 1691053322526,
        duration: 3,
        errorMessage: ['expected 1 to be 2'],
        filename: MODULE_ID,
      },
      {
        name: 'skipped',
        status: 'skip',
        startTime: 0,
        duration: 0,
        errorMessage: null,
        filename: MODULE_ID,
      },
      {
        name: 'later',
        status: 'todo',
        startTime: 0,
        duration: 0,
        errorMessage: null,
        filename: MODULE_ID,
      },
    ],
  } as unknown as VitestTestData;

  beforeEach(() => {
    jest.resetAllMocks();
    mockedUuid.v1.mockReturnValue('this-should-be-a-uuid-but-this-string-is-fine-for-testing');
    mockedGetCommonMetadata.mockReturnValue({} as CommonMetadata);
    mockedPostTestData.mockResolvedValue(true);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.env = originalProcessEnv;
    jest.restoreAllMocks();
  });

  it('should send the correct data', async () => {
    const plugin = new VitestTestDataPlugin('my custom identifier');
    plugin.onInit(mockedVitest);
    await plugin.onTestRunEnd([testModule]);

    expect(mockedGetCommonMetadata).toBeCalledWith(5, 'my custom identifier');
    expect(mockedPostTestData).toBeCalledTimes(1);
    expect(mockedPostTestData).toBeCalledWith('vitest', expect.objectContaining(expected));
  });

  it('should use process.env.npm_lifecycle_event as default custom identifier', async () => {
    process.env = { ...originalProcessEnv, npm_lifecycle_event: 'default_value' };

    const plugin = new VitestTestDataPlugin();
    plugin.onInit(mockedVitest);
    await plugin.onTestRunEnd([testModule]);

    expect(mockedGetCommonMetadata).toBeCalledWith(5, 'default_value');
    expect(mockedPostTestData).toBeCalledWith('vitest', expect.objectContaining(expected));
  });

  it('should not throw when the data cannot be sent', async () => {
    mockedPostTestData.mockResolvedValue(false);

    const plugin = new VitestTestDataPlugin('id');
    plugin.onInit(mockedVitest);
    await expect(plugin.onTestRunEnd([testModule])).resolves.toBeUndefined();

    expect(console.log).toBeCalledWith('Your test data has not been sent. See logs in devfeedback.log for more info.');
  });
});
