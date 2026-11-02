import axios from 'axios';
import fs from 'fs';
import getEndpoint from './getEndpoint';

export type JsonTestRunner = 'playwright' | 'vitest';

export const LOG_FILE = 'devfeedback.log';
export const TOKEN_HEADER = 'X-DevFeedback-Token';
export const TOKEN_ENVIRONMENT_VARIABLE = 'DEVFEEDBACK_TEST_TOKEN';

const TIMEOUT_MS = 10000;
const REDACTED = '<redacted>';

const getToken = (): string | undefined => {
  const token = process.env[TOKEN_ENVIRONMENT_VARIABLE];
  return token && token.trim() !== '' ? token : undefined;
};

const describeError = (error: unknown): Record<string, unknown> => {
  if (axios.isAxiosError(error)) {
    const headers: Record<string, unknown> = { ...(error.config?.headers ?? {}) };
    for (const name of Object.keys(headers)) {
      if (name.toLowerCase() === TOKEN_HEADER.toLowerCase()) {
        headers[name] = REDACTED;
      }
    }
    return {
      name: error.name,
      message: error.message,
      code: error.code,
      method: error.config?.method,
      url: error.config?.url,
      headers,
      status: error.response?.status,
      response: error.response?.data,
      stack: error.stack,
    };
  }
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { error: String(error) };
};

const writeLog = (error: unknown, token: string | undefined): void => {
  try {
    let text = JSON.stringify(describeError(error));
    if (token) {
      // Belt and braces: the token must not reach the log through any other field.
      text = text.split(token).join(REDACTED);
    }
    fs.writeFileSync(LOG_FILE, text);
  } catch (_) {
    // Telemetry must never fail a test run, not even when the log cannot be written.
  }
};

/**
 * POSTs a test report as JSON to the runner's endpoint. Sends the
 * X-DevFeedback-Token header only when DEVFEEDBACK_TEST_TOKEN is set and not
 * blank. Never throws: on failure it writes the error, with the token
 * redacted, to devfeedback.log and returns false.
 */
export const postTestData = async (runner: JsonTestRunner, body: unknown): Promise<boolean> => {
  const token = getToken();
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers[TOKEN_HEADER] = token;
    }
    await axios.post(getEndpoint(runner), body, { headers, timeout: TIMEOUT_MS });
    return true;
  } catch (error) {
    writeLog(error, token);
    return false;
  }
};

export default postTestData;
