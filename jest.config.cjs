// jest.config.cjs
export default {
  testEnvironment: 'node',
  transform: {},

  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['html', 'text-summary'],

  // Optional: only count coverage for pure modules
  collectCoverageFrom: [
    'docs/app/**/*.js',
    '!docs/app/search-main.js',
    '!docs/app/indexeddb.min.js',
    '!docs/app/types.js'
  ]
};
