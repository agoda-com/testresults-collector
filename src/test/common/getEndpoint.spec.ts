import getEndpoint from '../../common/getEndpoint';

describe('getEndpoint', () => {
    const originalProcessEnv = process.env;

    beforeEach(() => {
        process.env = { ...originalProcessEnv };
        delete process.env.BUILD_METRICS_ES_ENDPOINT;
        delete process.env.VITEST_METRICS_ENDPOINT;
        delete process.env.PLAYWRIGHT_METRICS_ENDPOINT;
    });

    afterAll(() => {
        process.env = originalProcessEnv;
    });

    test.each([
        ['jest', 'http://compilation-metrics/jest'],
        ['playwright', 'http://compilation-metrics/playwright'],
        ['vitest', 'http://compilation-metrics/vitest'],
    ] as const)('should default %s to %s', (testRunner, expected) => {
        expect(getEndpoint(testRunner)).toEqual(expected);
    });

    test('should let jest be overridden by BUILD_METRICS_ES_ENDPOINT', () => {
        process.env.BUILD_METRICS_ES_ENDPOINT = 'http://localhost:5000/custom';
        expect(getEndpoint('jest')).toEqual('http://localhost:5000/custom');
    });

    test.each([
        ['vitest', 'VITEST_METRICS_ENDPOINT'],
        ['playwright', 'PLAYWRIGHT_METRICS_ENDPOINT'],
    ] as const)('getEndpoint_UsesRunnerVarAndIgnoresBuildMetricsVar (%s)', (testRunner, variable) => {
        process.env.BUILD_METRICS_ES_ENDPOINT = 'http://localhost:5000/dotnet';
        expect(getEndpoint(testRunner)).toEqual(`http://compilation-metrics/${testRunner}`);

        process.env[variable] = `http://localhost:5000/${testRunner}`;
        expect(getEndpoint(testRunner)).toEqual(`http://localhost:5000/${testRunner}`);
    });

    test('should not let one runner read the other runner variable', () => {
        process.env.PLAYWRIGHT_METRICS_ENDPOINT = 'http://localhost:5000/playwright';
        expect(getEndpoint('vitest')).toEqual('http://compilation-metrics/vitest');
        expect(getEndpoint('jest')).toEqual('http://compilation-metrics/jest');
    });

    test('should fall back to the default when the variable is empty', () => {
        process.env.BUILD_METRICS_ES_ENDPOINT = '';
        process.env.VITEST_METRICS_ENDPOINT = '';
        expect(getEndpoint('jest')).toEqual('http://compilation-metrics/jest');
        expect(getEndpoint('vitest')).toEqual('http://compilation-metrics/vitest');
    });
});
