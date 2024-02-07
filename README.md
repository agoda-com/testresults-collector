# Jest Local Test Results Collector

### What is it?

An npm package that publishes test results object from Jest testResultsProcessor to an HTTP endpoint

## Objective

- We want to collect test run data from local machines (Laptops) to analyze and help improve the developer experience. We should be able to correlate this with data from CI to look for common behavior that indicates poor local experience.
- For example:
    - People not running test on their local, pushing to CI for testing
    - Specific test suites that only run on CI that people never run locally
    - Test that take a long time to run locally when compare to CI, or both CI and local are long
    - Tests that are repeatedly run on without code change to succeed, indicating flakiness (might be tricky)


### How does it work?

https://confluence.agodadev.io/display/agodae2e/Test+Data+Stats+Collector

## Getting Started

### Usage

Firstly, client will need to install Jest Local Test Results Collector package

```yarn add -D @agoda/jest-local-testresults-collector```

or 

```npm install --save-dev @agoda/jest-local-testresults-collector```

Next, user will require to add `testResultsProcessor` key to jest config 

`testResultsProcessor: '@agoda/jest-local-testresults-collector'`

Note: Jest config could be in either **package.json** OR **standalone file** (jest.config.js).

#### For example,

If there is jest section in `package.json`, simply add:
```{
  "name": "my-project",
  "jest": {
    "testResultsProcessor": "@agoda/jest-local-testresults-collector",
  }
}
```
or if there is `jest.config.js`, simply add: 

```"testResultsProcessor": "@agoda/jest-local-testresults-collector"```

## API

After include the package in your project, everytime when you run the test in local, the plugin will collect required data

1. User's metadata 

| Metadata          | Data Type |
|-------------------|---------|
|branch| STRING  |
|projectName| STRING  |
|repository| STRING  |
|repositoryName| STRING  |
|hostname| STRING        |
|username| STRING  |
|os| STRING  |
|osVersion| STRING  |
|gitCommitDate| STRING  |
|gitHeadCommit| STRING  |
|testRunner| STRING  |
|testRunnerVersion| STRING  |
|cpuCount| NUMBER  |

2.  Test Results (See [Test Results Schema](https://github.com/jestjs/jest/blob/6460335f88cee3dcb9d29c49d55ab02b9d83f994/packages/jest-test-result/src/types.ts))


Then, it will post to [API](https://gitlab.agodadev.io/full-stack/tooling/developer-local-metrics)

### Configuration

You can define an endpoint in the environment variable and the stats data will be sent there via HTTP POST Request

| Environment Variable | Default Value |
|----------|---------------|
|JEST_TESTDATA_API_URL|http://devlocalmetrics.tooling.hk.agoda.is/jest|




## Test Data Schema

After that, the data will be processed on API and inject to Hadoop 

See schema https://confluence.agodadev.io/display/agodae2e/Developer+Local+Metrics+API


## Development

For testing, you publish the beta version in the `release-beta` job on CI, and install the desired version to your repository using following command

` yarn add @agoda/jest-local-testresults-collector@<<beta version>> --force`

if the version is not updated, delete node_modules folder and reinstall

## Publish 

You can publish the new version using `release` job on CI. 
