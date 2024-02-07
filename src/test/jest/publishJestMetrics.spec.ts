const publishJestMetrics = require('../../jest');
import axios from 'axios'
import {mockedJestTestCaseSummary} from "../resources/mockedJestTestCaseSummary";
import * as getMetadata from '../../common/getMetadata';
import {IJestTestResults, IMetadata} from "../../common/types";

jest.mock('axios');
const axiosPostMock = jest.spyOn(axios, 'post');
const mockResponse = {status: 200};
axiosPostMock.mockResolvedValue(mockResponse);
jest.mock('../../common/getMetadata');


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
let expectedPayload: IJestTestResults = {
    ...metaData,
    testCaseSummary: mockedJestTestCaseSummary,
};
jest.spyOn(getMetadata, 'default').mockReturnValue(metaData);

const testEndpoint = 'http://localhost:5000/jest';
process.env.JEST_TESTDATA_API_URL = testEndpoint;

describe('publishJestMetrics', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    
    test('should call /jest  with the correct payload', async () => {
        await publishJestMetrics(mockedJestTestCaseSummary);
        expect(axiosPostMock).toHaveBeenCalledWith(
            testEndpoint, expectedPayload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    accept: '*/*',
                },
                timeout: 30000,
            }
        );
    });

    test('should return the results passed as parameter',async () => {
        const results = await publishJestMetrics(mockedJestTestCaseSummary);
        expect(results).toEqual(mockedJestTestCaseSummary)
    })
});
