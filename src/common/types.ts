export interface IMetadata {
    branch: string | null;
    hostname: string;
    username: string | null;
    os: string;
    osVersion: string;
    gitCommitDate: string | null;
    gitHeadCommit: string | null;
    testRunner: string;
    testRunnerVersion: string | null;
    projectName: string | null;
    repository: string | null;
    repositoryName: string | null;
    cpuCount: number;
    id: string | null;
}

export interface IJestTestResults extends IMetadata {
    testCaseSummary: any;
}
