import getMetadata from '../../common/getMetadata';
import os from 'os';
import child_process from 'child_process';
import {IMetadata} from '../../common/types';
import { v4 as uuidv4 } from 'uuid';

jest.mock('os', () => ({
    hostname: jest.fn(),
    userInfo: jest.fn(),
    type: jest.fn(),
    release: jest.fn(),
    cpus: jest.fn(),
}));

jest.mock('child_process', () => ({
    spawnSync: jest.fn(),
}));
jest.mock('uuid', () => ({ v4: () => '7288638f-4cb5-4a0b-8f47-ab965562b7e5' }));

const mockedOs = os as jest.Mocked<typeof os>;
const mockedChildProcess = child_process as jest.Mocked<typeof child_process>;

type mockSpawnSyncReturns = jest.Mocked<child_process.SpawnSyncReturns<string | Buffer>> & {
    stdout: Buffer;
};

describe('getMetadata', () => {
    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
      });

    const expectedMetadata:IMetadata = {
        branch: 'master',
        projectName: 'project',
        repository: 'https://github.com/example/project',
        repositoryName: 'project',
        hostname: 'hostname',
        username: 'username',
        os: 'os.type',
        osVersion: 'os.version',
        gitCommitDate: '2023-06-08T14:10:34.000+07:00',
        gitHeadCommit: 'ffac537e6cbbf934b08745a378932722df287a53',
        testRunner: 'jest',
        testRunnerVersion: '28.5.0',
        cpuCount: 0,
        id: '1658821493_1'
    };

    test('should return the correct metadata with mocked dependencies', () => {
        const username = 'username';
        const sha = 'ffac537e6cbbf934b08745a378932722df287a53';
        const branch = 'master';
        const runid = '1658821493';
        mockedChildProcess.spawnSync.mockReturnValueOnce({
            stdout: Buffer.from(branch),
        } as mockSpawnSyncReturns);
        mockedChildProcess.spawnSync.mockReturnValueOnce({
            stdout: Buffer.from('https://github.com/example/project'),
        } as mockSpawnSyncReturns);
        mockedChildProcess.spawnSync.mockReturnValueOnce({
            stdout: Buffer.from('1686208234'),
        } as mockSpawnSyncReturns);
        mockedChildProcess.spawnSync.mockReturnValueOnce({
            stdout: Buffer.from(sha),
        } as mockSpawnSyncReturns);

        mockedOs.hostname.mockReturnValue('hostname');
        mockedOs.userInfo.mockReturnValue({username: username, uid: 0, gid: 0, shell: 'shell', homedir: 'homedir'});
        mockedOs.type.mockReturnValue('os.type');
        mockedOs.release.mockReturnValue('os.version');
        mockedOs.cpus.mockReturnValue([]);
        jest.mock('jest/package.json', () => ({ version: '28.5.0' }));
        jest.mock('playwright/package.json', () => ({ version: '1.18.0' }));
        // Mock the process.env variables
        const originalProcessEnv = process.env;
        process.env = {
            ...originalProcessEnv,
            GITHUB_TRIGGERING_ACTOR: username,
            GITHUB_SHA: sha,
            GITHUB_REF_NAME: branch,
            GITHUB_RUN_ID: runid
        };
        const actualMetadata:IMetadata = getMetadata('jest');
        expect(actualMetadata).toEqual(expectedMetadata);
    });

    test('should send fields as <null> if their commands are invalid', () => {

        mockedOs.hostname.mockReturnValue('hostname');
        mockedOs.userInfo.mockReturnValue({username: 'username', uid: 0, gid: 0, shell: 'shell', homedir: 'homedir'});
        mockedOs.type.mockReturnValue('os.type');
        mockedOs.release.mockReturnValue('os.version');
        mockedOs.cpus.mockReturnValue([]);
        jest.mock('jest/package.json', () => ({ version: '' }));
        // Mock the process.env variables
        const originalProcessEnv = process.env;
        process.env = {
            ...originalProcessEnv,
            GITHUB_TRIGGERING_ACTOR: undefined,
            GITHUB_SHA: undefined,
            GITHUB_REF_NAME: undefined,
            GITHUB_RUN_ID: undefined
        };

        // @ts-ignore: spawnSync actually returned with `stdout` as null when the command is invalid
        mockedChildProcess.spawnSync.mockReturnValue({stdout: null});
        const metadata = getMetadata('jest');

        expect(metadata).toMatchObject<IMetadata>({
            testRunnerVersion: '',
            branch: null,
            projectName: null,
            repository: null,
            repositoryName: null,
            hostname: 'hostname',
            username: 'username',
            os: 'os.type',
            osVersion: 'os.version',
            gitCommitDate: null,
            gitHeadCommit: null,
            testRunner: 'jest',
            cpuCount: 0,
            id: uuidv4()
        });
    });

});

