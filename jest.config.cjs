// jest.config.cjs
export default {
  testEnvironment: 'node',
  transform: {},

  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['html', 'text-summary'],

  // Optional: only count coverage for pure modules
  collectCoverageFrom: [
    'docs/scripts/**/*.js',
    '!docs/scripts/search-main.js',
    '!docs/scripts/indexeddb.min.js',
    '!docs/scripts/types.js'
  ]
};
