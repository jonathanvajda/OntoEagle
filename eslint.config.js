const browserGlobals = {
  Blob: 'readonly',
  AbortController: 'readonly',
  DataTransfer: 'readonly',
  HTMLInputElement: 'readonly',
  HTMLSelectElement: 'readonly',
  HTMLTextAreaElement: 'readonly',
  Response: 'readonly',
  TextDecoder: 'readonly',
  TextEncoder: 'readonly',
  customElements: 'readonly',
  getComputedStyle: 'readonly',
  global: 'readonly',
  require: 'readonly',
  setImmediate: 'readonly',
  BroadcastChannel: 'readonly',
  CustomEvent: 'readonly',
  DOMParser: 'readonly',
  Event: 'readonly',
  File: 'readonly',
  FileReader: 'readonly',
  FormData: 'readonly',
  HTMLElement: 'readonly',
  IDBDatabase: 'readonly',
  IDBFactory: 'readonly',
  IDBObjectStore: 'readonly',
  IDBRequest: 'readonly',
  IDBTransaction: 'readonly',
  IntersectionObserver: 'readonly',
  KeyboardEvent: 'readonly',
  MutationObserver: 'readonly',
  Node: 'readonly',
  ResizeObserver: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  XMLSerializer: 'readonly',
  alert: 'readonly',
  atob: 'readonly',
  btoa: 'readonly',
  caches: 'readonly',
  cancelAnimationFrame: 'readonly',
  clearInterval: 'readonly',
  clearTimeout: 'readonly',
  confirm: 'readonly',
  console: 'readonly',
  crypto: 'readonly',
  document: 'readonly',
  fetch: 'readonly',
  globalThis: 'readonly',
  history: 'readonly',
  indexedDB: 'readonly',
  localStorage: 'readonly',
  location: 'readonly',
  navigator: 'readonly',
  performance: 'readonly',
  prompt: 'readonly',
  queueMicrotask: 'readonly',
  requestAnimationFrame: 'readonly',
  self: 'readonly',
  sessionStorage: 'readonly',
  setInterval: 'readonly',
  setTimeout: 'readonly',
  structuredClone: 'readonly',
  window: 'readonly'
};

const vendorGlobals = {
  N3: 'readonly',
  POSTAGGER_LEXICON: 'readonly',
  POSTagger: 'readonly',
  Tabulator: 'readonly',
  jsonld: 'readonly',
  Lemmatizer: 'readonly',
  mermaid: 'readonly'
};

const testGlobals = {
  afterAll: 'readonly',
  afterEach: 'readonly',
  beforeAll: 'readonly',
  beforeEach: 'readonly',
  describe: 'readonly',
  expect: 'readonly',
  jest: 'readonly',
  test: 'readonly'
};

export default [
  {
    ignores: [
      'coverage/**',
      'node_modules/**',
      'docs/app/shared/vendor/**',
      'docs/app/POSTaggerGraph.js',
      '**/*.min.js',
      '**/(deprecated)_*.js'
    ]
  },  {
    files: ['**/*.{js,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...browserGlobals,
        ...vendorGlobals,
        process: 'readonly'
      }
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]
    }
  },
  {
    files: ['tests/**/*.js', '**/__tests__/**/*.js'],
    languageOptions: {
      globals: testGlobals
    }
  }
];
