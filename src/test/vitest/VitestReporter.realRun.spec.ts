/**
 * @jest-environment node
 */
import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import { AddressInfo } from 'net';
import { LOG_FILE } from '../../common/transport';
import { assertMatchesFixture, loadFixture } from '../contracts/assertMatchesFixture';

// Runs the repo's own vitest on ./fixture-project, whose config
// loads the reporter from source.
const PROJECT_DIR = path.join(__dirname, 'fixture-project');
const VITEST_BIN = path.join(path.dirname(require.resolve('vitest/package.json')), 'vitest.mjs');
const RUN_TIMEOUT_MS = 60000;

interface Run {
  exitCode: number | null;
  output: string;
}

interface Received {
  url: string | undefined;
  body: string;
}

const runVitest = (testFileFilter: string, endpoint: string, cwd: string): Promise<Run> =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [VITEST_BIN, 'run', testFileFilter, '--root', PROJECT_DIR], {
      cwd,
      env: {
        ...process.env,
        VITEST_METRICS_ENDPOINT: endpoint,
        VITE_CONFIG_NATIVE_IGNORE_WARNING: 'true',
        NO_COLOR: '1',
      },
    });
    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { output += chunk; });
    child.on('error', reject);
    child.on('close', (exitCode) => resolve({ exitCode, output }));
  });

const listen = (server: http.Server): Promise<string> => new Promise((resolve) => {
  server.listen(0, '127.0.0.1', () => {
    const { port } = server.address() as AddressInfo;
    resolve(`http://127.0.0.1:${port}/vitest`);
  });
});

const close = (server: http.Server): Promise<void> => new Promise((resolve) => {
  if (!server.listening) {
    resolve();
    return;
  }
  server.close(() => resolve());
});

// The run's cwd, so devfeedback.log never lands in the repo.
const makeWorkDir = (): string => fs.mkdtempSync(path.join(os.tmpdir(), 'vitest-reporter-'));

describe('VitestReporter on a real vitest run', () => {
  describe('with a server', () => {
    let workDir: string;
    let server: http.Server;
    let received: Received[];
    let run: Run;

    // One vitest run, shared by the tests in this block.
    beforeAll(async () => {
      workDir = makeWorkDir();
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
      const endpoint = await listen(server);
      run = await runVitest('two-cases', endpoint, workDir);
    }, RUN_TIMEOUT_MS);

    afterAll(async () => {
      await close(server);
      fs.rmSync(workDir, { recursive: true, force: true });
    });

    test('VitestReporter_OnRealVitestRun_PostsOnce', () => {
      // The fixture project has a failing test, so vitest itself exits 1.
      expect(run.exitCode).toBe(1);
      expect(received).toHaveLength(1);
      expect(received[0].url).toBe('/vitest');

      const payload = JSON.parse(received[0].body);
      expect(payload.type).toBe('vitest');
      expect(payload.customIdentifier).toBe('vitest-fixture');
      expect(payload.files).toHaveLength(1);
      expect(payload.files[0]).toEqual(expect.objectContaining({ name: 'two-cases.test.ts', status: 'fail' }));
      expect(payload.testcases).toHaveLength(2);
      expect(payload.testcases).toEqual(expect.arrayContaining([
        expect.objectContaining({
          name: 'two cases > passes',
          status: 'pass',
          errorMessage: null,
          filename: 'two-cases.test.ts',
        }),
        expect.objectContaining({
          name: 'two cases > fails',
          status: 'fail',
          errorMessage: [expect.stringContaining('expected 1 to be 2')],
          filename: 'two-cases.test.ts',
        }),
      ]));
      expect(run.output).toContain('Your test data has successfully been sent.');
    }, RUN_TIMEOUT_MS);

    test('VitestReporter_PayloadMatchesContractFixture', () => {
      expect(received).toHaveLength(1);
      expect(() => assertMatchesFixture(JSON.parse(received[0].body), loadFixture('vitest'))).not.toThrow();
    }, RUN_TIMEOUT_MS);
  });

  test('VitestReporter_WhenServerDown_DoesNotFailTheRun', async () => {
    // Take a free port, then close it, so nothing is listening there.
    const server = http.createServer();
    const endpoint = await listen(server);
    await close(server);

    const workDir = makeWorkDir();
    try {
      const run = await runVitest('passing', endpoint, workDir);

      expect(run.exitCode).toBe(0);
      expect(run.output).toContain(`Your test data has not been sent. See logs in ${LOG_FILE} for more info.`);
      expect(fs.existsSync(path.join(workDir, LOG_FILE))).toBe(true);
    } finally {
      fs.rmSync(workDir, { recursive: true, force: true });
    }
  }, RUN_TIMEOUT_MS);
});
