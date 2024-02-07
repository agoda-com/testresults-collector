import axios from 'axios';
import * as path from 'path';
import * as getMetadata from '../../common/getMetadata';
import { IMetadata } from "../../common/types";
import PublishLocalPlaywrightMetrics from '../../playwright/publishPlaywrightMetrics'
import { FullConfig } from '@playwright/test/reporter';
import FormData from 'form-data'

jest.mock('axios');
const axiosPostMock = jest.spyOn(axios, 'post');
const mockResponse = { status: 200 };
axiosPostMock.mockResolvedValue(mockResponse);
jest.mock('../../common/getMetadata');
jest.mock('form-data');

const metaData: IMetadata = {
  branch: 'main',
  projectName: 'project',
  repository: 'https://gitlab.agodadev.io/example/project',
  repositoryName: 'project',
  hostname: 'hostname',
  username: 'username',
  os: 'os.type',
  osVersion: 'os.version',
  gitCommitDate: '2023-06-08T14:10:34.000+07:00',
  gitHeadCommit: 'abcdef1234567890',
  testRunner: 'jest',
  testRunnerVersion: '27.0.0',
  cpuCount: 0,
  id: '7288638f-4cb5-4a0b-8f47-ab965562b7e5'
};
jest.spyOn(getMetadata, 'default').mockReturnValue(metaData);
const testEndpoint = process.env.PLAYWRIGHT_TESTDATA_API_URL || 'http://localhost:5000/testdata/junit';
process.env.PLAYWRIGHT_TESTDATA_API_URL = testEndpoint;

jest.mock('fs', () => {
  const originalFs = jest.requireActual('fs');
  return {
    ...originalFs,
    createReadStream: (pathParameter: string) => {
      const MOCKED_PLAYWRIGHT_REPORT_PATH = path.join(__dirname, '..', 'resources', 'mockedjunit.results.xml');
      return originalFs.createReadStream(MOCKED_PLAYWRIGHT_REPORT_PATH);
    },
  };
});

describe('PublishLocalPlaywrightMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  test('should set junitOutputFile correctly if JUnit reporter is configured', () => {
    const reporter = new PublishLocalPlaywrightMetrics();
    const config = {
      reporter: [['junit', { outputFile: 'path/to/outputFile' }]],
    } as FullConfig;

    reporter.onBegin(config);

    expect(reporter['junitOutputFile']).toEqual('path/to/outputFile');
  });


  test('should call /testdata/junit with the correct payload', async () => {
    const reporter = new PublishLocalPlaywrightMetrics();
    reporter.junitOutputFile = path.join(__dirname, '..', 'resources', 'mockedjunit.results.xml');
    await reporter.onEnd();
    expect(axios.post).toHaveBeenCalledWith(testEndpoint, expect.any(FormData), {
      headers: {
        "Content-Type": "multipart/form-data",
        "accept": 'application/json'
      },
      timeout: 30000
    });
  });
});
