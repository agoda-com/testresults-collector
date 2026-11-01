import path from 'path';
import { v4 as uuid4 } from 'uuid';
import type {
  Reporter, FullConfig, Suite, TestCase, TestResult,
} from '@playwright/test/reporter';
import { getCommonMetadata } from '../vitest/common';
import { postTestData, LOG_FILE } from '../common/transport';
import type { PlaywrightTestCase, PlaywrightTestData, PlaywrightTestFile } from './types';

// Playwright colours its error messages; the server stores plain text.
const ANSI_ESCAPES = /\u001b\[[0-9;]*m/g;

interface Attempt {
  test: TestCase;
  testcase: PlaywrightTestCase;
}

const toPosix = (filePath: string): string => filePath.split(path.sep).join('/');

// The test's titlePath without the root and project suites, which are not
// part of the test's name: "a.spec.tsx > group > test".
const getFullName = (test: TestCase): string => {
  const titles: string[] = [test.title];
  for (let suite: Suite | undefined = test.parent; suite; suite = suite.parent) {
    if (suite.type === 'file' || suite.type === 'describe') {
      titles.unshift(suite.title);
    }
  }
  return titles.join(' > ');
};

const getErrorMessage = (result: TestResult): string | null => {
  const messages = result.errors
    .map((error) => error.message ?? error.value)
    .filter((message): message is string => !!message)
    .map((message) => message.replace(ANSI_ESCAPES, ''));
  return messages.length > 0 ? messages.join('\n') : null;
};

const getFileStatus = (tests: TestCase[]): PlaywrightTestFile['status'] => {
  const outcomes = tests.map((test) => test.outcome());
  if (outcomes.includes('unexpected')) {
    return 'failed';
  }
  return outcomes.every((outcome) => outcome === 'skipped') ? 'skipped' : 'passed';
};

/**
 * Playwright reporter that posts one JSON report per run to
 * PLAYWRIGHT_METRICS_ENDPOINT, with one testcase entry per attempt so a test
 * that passes on retry shows both outcomes. Works the same for Playwright
 * component tests (@playwright/experimental-ct-*).
 */
class PublishLocalPlaywrightMetrics implements Reporter {
  private config: FullConfig | undefined;
  private startedAt = 0;
  private attempts: Attempt[] = [];

  printsToStdio(): boolean {
    return false;
  }

  onBegin(config: FullConfig) {
    this.config = config;
    this.startedAt = Date.now();
    this.attempts = [];
  }

  onTestEnd(test: TestCase, result: TestResult) {
    // config.rootDir is the testDir; paths are relative to the config file's
    // folder (the project root) so they match what the repo shows.
    const config = this.config;
    const baseDir = config?.configFile ? path.dirname(config.configFile) : config?.rootDir ?? process.cwd();
    this.attempts.push({
      test,
      testcase: {
        name: test.title,
        fullName: getFullName(test),
        file: toPosix(path.relative(baseDir, test.location.file)),
        project: test.parent.project()?.name ?? '',
        status: result.status,
        retry: result.retry,
        duration: result.duration,
        startTime: result.startTime.toISOString(),
        errorMessage: getErrorMessage(result),
      },
    });
  }

  private buildTestData(): PlaywrightTestData {
    const byFile = new Map<string, Attempt[]>();
    for (const attempt of this.attempts) {
      const attempts = byFile.get(attempt.testcase.file) ?? [];
      attempts.push(attempt);
      byFile.set(attempt.testcase.file, attempts);
    }
    const files: PlaywrightTestFile[] = [...byFile.entries()].map(([name, attempts]) => ({
      name,
      status: getFileStatus([...new Set(attempts.map((attempt) => attempt.test))]),
      duration: attempts.reduce((total, attempt) => total + attempt.testcase.duration, 0),
    }));
    const projects = this.config?.projects ?? [];

    return {
      ...getCommonMetadata(Date.now() - this.startedAt),
      type: 'playwright',
      playwrightVersion: this.config?.version ?? '',
      runId: uuid4(),
      workers: this.config?.workers ?? 0,
      retries: projects.reduce((most, project) => Math.max(most, project.retries), 0),
      files,
      testcases: this.attempts.map((attempt) => attempt.testcase),
    };
  }

  async onEnd() {
    const sent = await postTestData('playwright', this.buildTestData());
    if (sent) {
      console.log('Your Playwright test data has successfully been sent.');
    } else {
      console.log(`Your Playwright test data has not been sent. See logs in ${LOG_FILE} for more info.`);
    }
  }
}

export default PublishLocalPlaywrightMetrics;
