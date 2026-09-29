import getEndpoint from '../../common/getEndpoint';

describe('getEndpoint', () => {
    const originalProcessEnv = process.env;

    beforeEach(() => {
        process.env = { ...originalProcessEnv };
        delete process.env.BUILD_METRICS_ES_ENDPOINT;
    });

    afterAll(() => {
        process.env = originalProcessEnv;
    });

    test.each([
        ['jest', 'http://compilation-metrics/jest'],
        ['playwright', 'http://compilation-metrics/testdata/junit'],
        ['vitest', 'http://compilation-metrics/vitest'],
    ] as const)('should default %s to %s', (testRunner, expected) => {
        expect(getEndpoint(testRunner)).toEqual(expected);
    });

    test.each(['jest', 'playwright', 'vitest'] as const)(
        'should let %s be overridden by BUILD_METRICS_ES_ENDPOINT',
        (testRunner) => {
            process.env.BUILD_METRICS_ES_ENDPOINT = 'http://localhost:5000/custom';
            expect(getEndpoint(testRunner)).toEqual('http://localhost:5000/custom');
        },
    );

    test('should fall back to the default when the variable is empty', () => {
        process.env.BUILD_METRICS_ES_ENDPOINT = '';
        expect(getEndpoint('jest')).toEqual('http://compilation-metrics/jest');
    });
});
