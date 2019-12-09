'use strict';

module.exports = dirname => ({
  preset: 'ts-jest',
  displayName: require(`${dirname}/package.json`).name,

  // The test environment that will be used for testing
  testEnvironment: 'node',
});
