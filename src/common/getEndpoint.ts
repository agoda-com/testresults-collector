export type TestRunner = 'jest' | 'playwright' | 'vitest';

// Default host, shared with the other devfeedback libraries
const BASE_URL = 'http://compilation-metrics';

// Each runner reads its own override. Jest keeps the family-wide variable;
// Vitest and Playwright do not read it, because it points at /dotnet wherever
// .NET builds report.
const ENDPOINT_ENVIRONMENT_VARIABLES: Record<TestRunner, string> = {
    jest: 'BUILD_METRICS_ES_ENDPOINT',
    playwright: 'PLAYWRIGHT_METRICS_ENDPOINT',
    vitest: 'VITEST_METRICS_ENDPOINT',
};

const PATHS: Record<TestRunner, string> = {
    jest: 'jest',
    playwright: 'playwright',
    vitest: 'vitest',
};

function getEndpoint(testRunner: TestRunner): string {
    return process.env[ENDPOINT_ENVIRONMENT_VARIABLES[testRunner]] || `${BASE_URL}/${PATHS[testRunner]}`;
}

export default getEndpoint;
