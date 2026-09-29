export type TestRunner = 'jest' | 'playwright' | 'vitest';

// Default host and override, shared with the other devfeedback libraries
const BASE_URL = 'http://compilation-metrics';
const ENDPOINT_ENVIRONMENT_VARIABLE = 'BUILD_METRICS_ES_ENDPOINT';

const PATHS: Record<TestRunner, string> = {
    jest: 'jest',
    playwright: 'testdata/junit',
    vitest: 'vitest',
};

function getEndpoint(testRunner: TestRunner): string {
    return process.env[ENDPOINT_ENVIRONMENT_VARIABLE] || `${BASE_URL}/${PATHS[testRunner]}`;
}

export default getEndpoint;
