export const mockedJestTestCaseSummary:any = {
    numFailedTestSuites: 2,
    numFailedTests: 5,
    numPassedTestSuites: 3,
    numPassedTests: 10,
    numPendingTestSuites: 1,
    numPendingTests: 2,
    numRuntimeErrorTestSuites: 0,
    numTodoTests: 0,
    numTotalTestSuites: 6,
    numTotalTests: 17,
    openHandles: [],
    snapshot: {
        added: 2,
        didUpdate: true,
        failure: false,
        filesAdded: 2,
        filesRemoved: 0,
        filesRemovedList: [],
        filesUnmatched: 0,
        filesUpdated: 0,
        matched: 3,
        total: 5,
        unchecked: 0,
        uncheckedKeysByFile: [],
        unmatched: 0,
        updated: 0,
        fileDeleted: false,
        uncheckedKeys: []
    },
    startTime: 1686710925789,
    success: true,
    testResults: [
        {
            leaks: false,
            numFailingTests: 2,
            numPassingTests: 8,
            numPendingTests: 1,
            numTodoTests: 0,
            openHandles: [],
            perfStats: {
                end: 1686710932634,
                runtime: 5645,
                slow: true,
                start: 1686710926989
            },
            skipped: false,
            snapshot: {
                added: 0,
                fileDeleted: false,
                matched: 0,
                unchecked: 0,
                uncheckedKeys: [],
                unmatched: 0,
                updated: 0
            },
            testFilePath: '/path/to/test/file',
            testResults:
                [{
                    ancestorTitles: [""],
                    duration: 23,
                    failureDetails: [
                        {
                            matcherResult: {
                                actual: 'S',
                                expected: 'SS',
                                message: '',
                                name: 'toBe',
                                pass: false
                            }
                        }
                    ],
                    failureMessages: [''],
                    fullName: '',
                    invocations: 1,
                    location: null,
                    numPassingAsserts: 0,
                    retryReasons: [],
                    status: 'failed',
                    title: 'should render correctly'
                },
                ],
            failureMessage: ''
        }
    ],
    wasInterrupted: false,
};

