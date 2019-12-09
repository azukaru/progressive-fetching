'use strict';

const fs = require('fs');

module.exports = {
  // Disable root tests
  testMatch: [],

  // Load test suites for packages
  projects: fs.readdirSync(__dirname + '/packages').map(pkgName => {
    // Only include directories
    if (pkgName.includes('.')) return null;
    return `<rootDir>/packages/${pkgName}`;
  }).filter(Boolean),
};
