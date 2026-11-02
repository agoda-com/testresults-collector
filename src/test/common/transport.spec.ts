/**
 * @jest-environment node
 */
import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { AddressInfo } from 'net';
import { postTestData, LOG_FILE } from '../../common/transport';

interface Received {
  headers: http.IncomingHttpHeaders;
  body: string;
}

const TOKEN = 'abc123secrettoken';

describe('postTestData', () => {
  const originalProcessEnv = process.env;
  const originalCwd = process.cwd();
  let server: http.Server;
  let received: Received[];
  let workDir: string;

  const startServer = (): Promise<string> => new Promise((resolve) => {
    received = [];
    server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        received.push({ headers: req.headers, body });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{}');
      });
    });
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      resolve(`http://127.0.0.1:${port}`);
    });
  });

  const stopServer = (): Promise<void> => new Promise((resolve) => {
    if (!server.listening) {
      resolve();
      return;
    }
    server.close(() => resolve());
  });

  beforeEach(() => {
    process.env = { ...originalProcessEnv };
    delete process.env.DEVFEEDBACK_TEST_TOKEN;
    delete process.env.VITEST_METRICS_ENDPOINT;
    delete process.env.PLAYWRIGHT_METRICS_ENDPOINT;
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'transport-spec-'));
    process.chdir(workDir);
  });

  afterEach(async () => {
    await stopServer();
    process.chdir(originalCwd);
    fs.rmSync(workDir, { recursive: true, force: true });
  });

  afterAll(() => {
    process.env = originalProcessEnv;
  });

  test('postTestData_WhenTokenSet_SendsHeader', async () => {
    const baseUrl = await startServer();
    process.env.VITEST_METRICS_ENDPOINT = `${baseUrl}/vitest`;
    process.env.DEVFEEDBACK_TEST_TOKEN = TOKEN;

    const sent = await postTestData('vitest', { type: 'vitest', runId: 'r1' });

    expect(sent).toBe(true);
    expect(received).toHaveLength(1);
    expect(received[0].headers['x-devfeedback-token']).toEqual(TOKEN);
    expect(received[0].headers['content-type']).toContain('application/json');
    expect(JSON.parse(received[0].body)).toEqual({ type: 'vitest', runId: 'r1' });
  });

  test.each(['', '   ', undefined])('postTestData_WhenTokenBlank_SendsNoHeader (%p)', async (token) => {
    const baseUrl = await startServer();
    process.env.PLAYWRIGHT_METRICS_ENDPOINT = `${baseUrl}/playwright`;
    if (token !== undefined) {
      process.env.DEVFEEDBACK_TEST_TOKEN = token;
    }

    const sent = await postTestData('playwright', { type: 'playwright' });

    expect(sent).toBe(true);
    expect(received).toHaveLength(1);
    expect(received[0].headers).not.toHaveProperty('x-devfeedback-token');
  });

  test('postTestData_WhenServerDown_ReturnsFalseAndRedactsToken', async () => {
    const baseUrl = await startServer();
    await stopServer();
    process.env.VITEST_METRICS_ENDPOINT = `${baseUrl}/vitest`;
    process.env.DEVFEEDBACK_TEST_TOKEN = TOKEN;

    const sent = await postTestData('vitest', { type: 'vitest' });

    expect(sent).toBe(false);
    const log = fs.readFileSync(path.join(workDir, LOG_FILE), 'utf8');
    expect(log).not.toContain(TOKEN);
    const entry = JSON.parse(log);
    expect(entry.code).toEqual('ECONNREFUSED');
    expect(entry.headers['X-DevFeedback-Token']).toEqual('<redacted>');
  });
});
