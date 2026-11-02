import type { CommonMetadata } from '../vitest/types';

export type PlaywrightTestStatus = 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted';

export interface PlaywrightTestFile {
  name: string;
  status: PlaywrightTestStatus;
  duration: number;
}

/** One attempt of one test: a test that passes on retry 1 has two entries. */
export interface PlaywrightTestCase {
  name: string;
  fullName: string;
  file: string;
  project: string;
  status: PlaywrightTestStatus;
  retry: number;
  duration: number;
  startTime: string;
  errorMessage: string | null;
}

export interface PlaywrightTestData extends CommonMetadata {
  type: 'playwright';
  playwrightVersion: string;
  runId: string;
  workers: number;
  retries: number;
  files: PlaywrightTestFile[];
  testcases: PlaywrightTestCase[];
}
