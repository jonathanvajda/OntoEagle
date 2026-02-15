// jest.config.cjs

module.exports = {
  testEnvironment: 'node',
  transform: {},

  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['html', 'text-summary'],

  collectCoverageFrom: [
    'docs/app/**/*.js',
    '!docs/app/search-main.js',
    '!docs/app/indexeddb.min.js',
    '!docs/app/types.js'
  ]
};
