export interface CommonMetadata {
  id: string;
  userName: string;
  cpuCount: number;
  hostname: string;
  platform: string;
  os: string;
  timeTaken: number;
  branch: string;
  projectName: string;
  repository: string;
  repositoryName: string;
  timestamp: number | null;
  builtAt: string | null;
  totalMemory: number;
  cpuModels: string[];
  cpuSpeed: number[];
  nodeVersion: string;
  v8Version: string;
  commitSha: string;
  customIdentifier: string | null;
}

/**
 * Status as sent to the server. Kept in the Vitest 0.x task-state vocabulary
 * (`pass`, `fail`, ...) that the server already stores.
 */
export type VitestStatus = 'run' | 'skip' | 'todo' | 'pass' | 'fail';

export interface VitestTestFile {
  name: string;
  collectDuration: number;
  setupDuration: number;
  prepareDuration: number;
  environmentLoad: number;
  status: VitestStatus;
  startTime: number;
  duration: number;
}

export interface VitestTestCase {
  name: string;
  status: VitestStatus;
  errorMessage: string[] | null;
  startTime: number;
  duration: number;
  filename: string;
}

export interface VitestTestData extends CommonMetadata {
  type: 'vitest';
  vitestVersion: string;
  mode: string;
  maxConcurrency: number;
  watchMode: boolean;
  testEnvironment: string;
  runId: string;
  files: VitestTestFile[];
  testcases: VitestTestCase[];
}
