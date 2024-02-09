import type {
  CommonMetadata,
  VitestTestData,
} from './types';
import { v1 as uuidv1 } from 'uuid';
import os from 'os';
import fs from 'fs';
import { spawnSync } from 'child_process';
import safelyTry from 'safely-try';
import axios from 'axios';

const UNKNOWN_VALUE = '<unknown>';

const runGitCommand = (args: string[]): string | undefined => {
  const [result] = safelyTry(() => spawnSync('git', args).stdout.toString().trim());
  return result;
};

export const getCommonMetadata = (
  timeTaken: number,
  customIdentifier: string = process.env.npm_lifecycle_event ?? UNKNOWN_VALUE,
): CommonMetadata => {
  const repoUrl = runGitCommand(['config', '--get', 'remote.origin.url']);
  let repoName = repoUrl
    ? repoUrl.substring(repoUrl.lastIndexOf('/') + 1)
    : UNKNOWN_VALUE;
  repoName = repoName.endsWith('.git')
    ? repoName.substring(0, repoName.lastIndexOf('.'))
    : repoName;

  const username = process.env.GITLAB_USER_LOGIN || process.env.GITHUB_TRIGGERING_ACTOR;
  const [osUsername] = safelyTry(() => os.userInfo().username);

  return {
    id: uuidv1(),
    userName: (username ? username : osUsername) ?? UNKNOWN_VALUE,
    cpuCount: os.cpus().length,
    hostname: os.hostname(),
    platform: os.type(),
    os: os.release(),
    timeTaken: timeTaken,
    branch: runGitCommand(['rev-parse', '--abbrev-ref', 'HEAD']) ?? UNKNOWN_VALUE,
    projectName: repoName,
    repository: repoUrl ?? UNKNOWN_VALUE,
    repositoryName: repoName,
    timestamp: Date.now(),
    builtAt: new Date().toISOString(),
    totalMemory: os.totalmem(),
    cpuModels: os.cpus().map((cpu) => cpu.model),
    cpuSpeed: os.cpus().map((cpu) => cpu.speed),
    nodeVersion: process.version,
    v8Version: process.versions.v8,
    commitSha: runGitCommand(['rev-parse', 'HEAD']) ?? UNKNOWN_VALUE,
    customIdentifier: customIdentifier,
  };
};

const ENDPOINT_FROM_TYPE = {
  vitest: process.env.VITEST_TESTDATA_API_URL ?? UNKNOWN_VALUE, // your api endpoint eg. http://your_domain/vitest
};

const LOG_FILE = 'devfeedback.log';

const sendData = async (endpoint: string, data: CommonMetadata): Promise<boolean> => {
  const [_, error] = await safelyTry(() => axios.post(endpoint, data));
  if (error) {
    fs.writeFileSync(LOG_FILE, JSON.stringify(error, Object.getOwnPropertyNames(error)));
    return false;
  }
  return true;
};

export const sendTestData = async (testData: VitestTestData) => {
  const endpoint = ENDPOINT_FROM_TYPE[testData.type];

  console.log(`Your test time was ${testData.timeTaken.toFixed(2)}ms.`);

  const sent = await sendData(endpoint, testData);
  if (!sent) {
    console.log(
      `Your test data has not been sent. See logs in ${LOG_FILE} for more info.`,
    );
    return;
  }

  console.log(`Your test data has successfully been sent.`);
};
