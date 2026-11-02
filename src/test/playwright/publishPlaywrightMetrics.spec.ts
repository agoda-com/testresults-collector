/**
 * @jest-environment node
 */
import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { AddressInfo } from 'net';
import type {
  FullConfig, FullProject, Location, Suite, TestCase, TestResult,
} from '@playwright/test/reporter';
import PublishLocalPlaywrightMetrics from '../../playwright/publishPlaywrightMetrics';
import type { PlaywrightTestData } from '../../playwright/types';
import { LOG_FILE } from '../../common/transport';
import { assertMatchesFixture, loadFixture } from '../contracts/assertMatchesFixture';

const ROOT_DIR = path.join(os.tmpdir(), 'pw-project');

// Builders for Playwright's own reporter shapes, the way the runner hands
// them to a reporter: root -> project -> file -> describe -> test.

const makeProject = (name: string, retries: number): FullProject => ({
  dependencies: [],
  grep: /.*/,
  grepInvert: null,
  ignoreSnapshots: false,
  metadata: {},
  name,
  outputDir: path.join(ROOT_DIR, 'test-results'),
  repeatEach: 1,
  retries,
  snapshotDir: path.join(ROOT_DIR, 'src'),
  testDir: path.join(ROOT_DIR, 'src'),
  testIgnore: [],
  testMatch: '**/*.spec.tsx',
  timeout: 30000,
  use: {},
});

const makeConfig = (projects: FullProject[]): FullConfig => ({
  projects,
  reporter: [['agoda-test-metrics/playwright', undefined]],
  webServer: null,
  argv: [],
  failOnFlakyTests: false,
  forbidOnly: false,
  fullyParallel: true,
  globalSetup: null,
  globalTeardown: null,
  globalTimeout: 0,
  grep: /.*/,
  grepInvert: null,
  maxFailures: 0,
  metadata: {},
  preserveOutput: 'always',
  quiet: false,
  reportSlowTests: null,
  configFile: path.join(ROOT_DIR, 'playwright.config.ts'),
  rootDir: path.join(ROOT_DIR, 'src'),
  shard: null,
  tags: [],
  updateSnapshots: 'missing',
  updateSourceMethod: 'patch',
  version: '1.62.0',
  workers: 2,
});

const makeSuite = (type: Suite['type'], title: string, parent: Suite | undefined, project: FullProject | undefined): Suite => {
  const suite: Suite = {
    type,
    title,
    parent,
    suites: [],
    tests: [],
    allTests: () => [...suite.tests, ...suite.suites.flatMap((child) => child.allTests())],
    entries: () => [...suite.suites, ...suite.tests],
    project: () => project,
    titlePath: () => [...(parent ? parent.titlePath() : []), title],
  };
  parent?.suites.push(suite);
  return suite;
};

const makeFileSuite = (project: FullProject, file: string): Suite => {
  const root = makeSuite('root', '', undefined, undefined);
  const projectSuite = makeSuite('project', project.name, root, project);
  return makeSuite('file', file, projectSuite, project);
};

const makeTest = (parent: Suite, title: string, retries: number): TestCase => {
  let fileSuite: Suite | undefined = parent;
  while (fileSuite && fileSuite.type !== 'file') fileSuite = fileSuite.parent;
  const location: Location = { file: path.join(ROOT_DIR, 'src', fileSuite?.title ?? ''), line: 3, column: 1 };
  const test: TestCase = {
    type: 'test',
    title,
    parent,
    location,
    id: `${parent.title}-${title}`,
    annotations: [],
    expectedStatus: 'passed',
    repeatEachIndex: 0,
    results: [],
    retries,
    tags: [],
    timeout: 30000,
    titlePath: () => [...parent.titlePath(), title],
    ok: () => test.outcome() !== 'unexpected',
    outcome: () => {
      const statuses = test.results.map((result) => result.status);
      if (statuses.every((status) => status === 'skipped')) return 'skipped';
      if (statuses[statuses.length - 1] !== 'passed') return 'unexpected';
      return statuses.length > 1 ? 'flaky' : 'expected';
    },
  };
  parent.tests.push(test);
  return test;
};

const makeResult = (
  retry: number,
  status: TestResult['status'],
  duration: number,
  startTime: string,
  errorMessage?: string,
): TestResult => ({
  annotations: [],
  attachments: [],
  duration,
  error: errorMessage ? { message: errorMessage } : undefined,
  errors: errorMessage ? [{ message: errorMessage }] : [],
  parallelIndex: 0,
  retry,
  startTime: new Date(startTime),
  status,
  stderr: [],
  stdout: [],
  steps: [],
  workerIndex: retry,
});

// Runs the reporter the way Playwright does: onBegin, onTestEnd per attempt,
// then awaits onEnd.
const runReporter = async (config: FullConfig, attempts: Array<[TestCase, TestResult]>): Promise<void> => {
  const reporter = new PublishLocalPlaywrightMetrics();
  reporter.onBegin(config);
  for (const [test, result] of attempts) {
    test.results.push(result);
    reporter.onTestEnd(test, result);
  }
  await reporter.onEnd();
};

describe('PublishLocalPlaywrightMetrics', () => {
  const originalProcessEnv = process.env;
  const originalCwd = process.cwd();
  let server: http.Server;
  let received: Array<{ url: string | undefined; body: string }>;
  let workDir: string;

  const startServer = (): Promise<string> => new Promise((resolve) => {
    received = [];
    server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        received.push({ url: req.url, body });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{}');
      });
    });
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      resolve(`http://127.0.0.1:${port}`);
    });
  });

  const stopServer = (): Promise<void> => new Promise((resolve) => {
    if (!server?.listening) {
      resolve();
      return;
    }
    server.close(() => resolve());
  });

  const sentReport = (): PlaywrightTestData => {
    expect(received).toHaveLength(1);
    expect(received[0].url).toEqual('/playwright');
    return JSON.parse(received[0].body);
  };

  beforeEach(() => {
    process.env = { ...originalProcessEnv };
    delete process.env.DEVFEEDBACK_TEST_TOKEN;
    delete process.env.PLAYWRIGHT_METRICS_ENDPOINT;
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'playwright-reporter-spec-'));
    process.chdir(workDir);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await stopServer();
    process.chdir(originalCwd);
    fs.rmSync(workDir, { recursive: true, force: true });
  });

  afterAll(() => {
    process.env = originalProcessEnv;
  });

  test('PlaywrightReporter_PayloadMatchesContractFixture', async () => {
    process.env.PLAYWRIGHT_METRICS_ENDPOINT = `${await startServer()}/playwright`;
    const project = makeProject('chromium', 1);
    const file = makeFileSuite(project, 'a.spec.tsx');
    const passes = makeTest(file, 'passes', 1);
    const flaky = makeTest(file, 'flaky', 1);
    const fails = makeTest(file, 'fails', 1);

    await runReporter(makeConfig([project]), [
      [passes, makeResult(0, 'passed', 300, '2026-11-02T00:00:00.000Z')],
      [flaky, makeResult(0, 'failed', 250, '2026-11-02T00:00:00.300Z', '\u001b[31mlocator not visible\u001b[39m')],
      [flaky, makeResult(1, 'passed', 200, '2026-11-02T00:00:00.600Z')],
      [fails, makeResult(0, 'timedOut', 150, '2026-11-02T00:00:00.800Z', 'Test timeout of 30000ms exceeded.')],
    ]);

    const report = sentReport();
    assertMatchesFixture(report, loadFixture('playwright'));
    expect(report).toMatchObject({
      type: 'playwright',
      playwrightVersion: '1.62.0',
      workers: 2,
      retries: 1,
      files: [{ name: 'src/a.spec.tsx', status: 'failed', duration: 900 }],
    });
    expect(report.testcases[0]).toEqual({
      name: 'passes',
      fullName: 'a.spec.tsx > passes',
      file: 'src/a.spec.tsx',
      project: 'chromium',
      status: 'passed',
      retry: 0,
      duration: 300,
      startTime: '2026-11-02T00:00:00.000Z',
      errorMessage: null,
    });
    expect(report.testcases[1].errorMessage).toEqual('locator not visible');
  });

  test('PlaywrightReporter_WhenTestPassesOnRetry_SendsTwoAttempts', async () => {
    process.env.PLAYWRIGHT_METRICS_ENDPOINT = `${await startServer()}/playwright`;
    const project = makeProject('ct', 2);
    const file = makeFileSuite(project, 'Button.spec.tsx');
    const group = makeSuite('describe', 'Button', file, project);
    const flaky = makeTest(group, 'clicks', 2);

    await runReporter(makeConfig([project]), [
      [flaky, makeResult(0, 'failed', 40, '2026-11-02T00:00:01.000Z', 'expect(received).toBe(expected)')],
      [flaky, makeResult(1, 'passed', 30, '2026-11-02T00:00:02.000Z')],
    ]);

    const report = sentReport();
    expect(report.testcases.map(({ fullName, project: name, retry, status }) => ({ fullName, name, retry, status }))).toEqual([
      { fullName: 'Button.spec.tsx > Button > clicks', name: 'ct', retry: 0, status: 'failed' },
      { fullName: 'Button.spec.tsx > Button > clicks', name: 'ct', retry: 1, status: 'passed' },
    ]);
    expect(report.files).toEqual([{ name: 'src/Button.spec.tsx', status: 'passed', duration: 70 }]);
  });

  test('PlaywrightReporter_WhenTimedOut_SendsTimedOut', async () => {
    process.env.PLAYWRIGHT_METRICS_ENDPOINT = `${await startServer()}/playwright`;
    const project = makeProject('chromium', 0);
    const file = makeFileSuite(project, 'slow.spec.tsx');
    const slow = makeTest(file, 'waits', 0);

    await runReporter(makeConfig([project]), [
      [slow, makeResult(0, 'timedOut', 30000, '2026-11-02T00:00:00.000Z', 'Test timeout of 30000ms exceeded.')],
    ]);

    const report = sentReport();
    expect(report.testcases).toHaveLength(1);
    expect(report.testcases[0]).toMatchObject({
      status: 'timedOut',
      retry: 0,
      errorMessage: 'Test timeout of 30000ms exceeded.',
    });
    expect(report.files[0].status).toEqual('failed');
  });

  test('PlaywrightReporter_WhenServerDown_DoesNotThrow', async () => {
    const baseUrl = await startServer();
    await stopServer();
    process.env.PLAYWRIGHT_METRICS_ENDPOINT = `${baseUrl}/playwright`;
    const project = makeProject('chromium', 0);
    const test = makeTest(makeFileSuite(project, 'a.spec.tsx'), 'passes', 0);

    await expect(runReporter(makeConfig([project]), [
      [test, makeResult(0, 'passed', 10, '2026-11-02T00:00:00.000Z')],
    ])).resolves.toBeUndefined();

    expect(JSON.parse(fs.readFileSync(path.join(workDir, LOG_FILE), 'utf8')).code).toEqual('ECONNREFUSED');
  });
});
