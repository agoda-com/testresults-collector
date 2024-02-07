import {spawnSync} from 'child_process';
import * as os from 'os';
import {DateTime} from 'luxon';
import {IMetadata} from './types';
import {v4 as uuid4} from 'uuid';

const safelyTry = <T>(fn: () => T): T | undefined => {
    try {
        return fn();
    } catch (_) {
        return undefined;
    }
};
const getTestRunnerVersion = (runner:string) => safelyTry(() => {
    if (runner === 'jest') {
        const jestPath = require.resolve('jest/package.json');
        const jestPackageJson = require(jestPath);
        return jestPackageJson.version;
    } else if (runner === 'playwright') {
        let playwrightVersion;
        try {
            const playwrightTestPath = require.resolve('@playwright/test/package.json');
            const playwrightTestPackageJson = require(playwrightTestPath);
            playwrightVersion = playwrightTestPackageJson.version;
        } catch (error: any) {
            if (error === 'MODULE_NOT_FOUND') {
                try {
                    const playwrightPath = require.resolve('playwright/package.json');
                    const playwrightPackageJson = require(playwrightPath);
                    playwrightVersion = playwrightPackageJson.version;
                } catch (innerError: any) {
                    if (innerError.code === 'MODULE_NOT_FOUND') {
                        console.log('Neither @playwright/test nor playwright packages were found.');
                    }
                }
            }
        }
        return playwrightVersion;
    }
});

function getMetadata(runner: string): IMetadata {
    const testRunnerVersion: string | null = getTestRunnerVersion(runner) ?? null;
    const runGitCommand = (args: string[]): string | undefined => safelyTry(() => spawnSync('git', args).stdout?.toString().trim());
    const gitBranch = runGitCommand(['rev-parse', '--abbrev-ref', 'HEAD']) ?? null;
    let gitProjectUrl = runGitCommand(['config', '--get', 'remote.origin.url']) ?? null;
    if (gitProjectUrl && gitProjectUrl.startsWith("git@")) {
        const url = new URL(`ssh://${gitProjectUrl.replace(":", "/")}`);
        gitProjectUrl = `https://${url.host}${url.pathname}`;
    }
    if (gitProjectUrl) {
        gitProjectUrl = gitProjectUrl.replace(/(https:\/\/)[^@]*@/g, 'https://');
    }
    const gitCommitUnixTimestamp = Number(runGitCommand(['log', '-1', '--format=%ct'])) ?? NaN;
    const gitCommitDate = !isNaN(gitCommitUnixTimestamp) ? DateTime.fromSeconds(gitCommitUnixTimestamp).setZone('Asia/Bangkok') : null;
    const gitHeadCommit = runGitCommand(['rev-parse', 'HEAD']) ?? null;
    const userInfo = safelyTry(() => os.userInfo());
    let repoName = gitProjectUrl ? gitProjectUrl.substring(gitProjectUrl.lastIndexOf('/') + 1) : null;
    if (repoName?.endsWith('.git')) {
        repoName = repoName?.substring(0, repoName?.lastIndexOf('.'));
    }
    const ci_unique_run_id = process.env.GITHUB_RUN_ID?.concat('_').concat(process.env.GITHUB_RUN_NUMBER || '1');

    return {
        branch: process.env.GITHUB_REF_NAME || gitBranch,
        projectName: repoName,
        repository: gitProjectUrl,
        repositoryName: repoName,
        hostname: os.hostname(),
        username: process.env.GITHUB_TRIGGERING_ACTOR || (userInfo ? userInfo.username : null),
        os: os.type(),
        osVersion: os.release(),
        gitCommitDate: gitCommitDate ? gitCommitDate.toISO() : null,
        gitHeadCommit: gitHeadCommit,
        testRunner: runner,
        testRunnerVersion: testRunnerVersion,
        cpuCount: os.cpus().length,
        id: ci_unique_run_id || uuid4()
    };
}

export default getMetadata;
