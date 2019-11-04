// For a detailed explanation regarding each configuration property, visit:
// https://jestjs.io/docs/en/configuration.html

module.exports = {
  preset: 'ts-jest',

  collectCoverage: false,
  coverageDirectory: "coverage",

  // The test environment that will be used for testing
  testEnvironment: "node",

  modulePathIgnorePatterns: [
    'packages/.*/pkg',
  ],
};
