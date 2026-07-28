// jest.config.cjs

module.exports = {
  testEnvironment: 'node',
  transform: {},

  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['html', 'text-summary'],

  collectCoverageFrom: [
    'docs/app/**/*.js',
    'monorepo-staging/packages/**/*.js',
    '!docs/app/search-main.js',
    '!docs/app/shared/vendor/**',
    '!docs/app/types.js'
  ]
};
