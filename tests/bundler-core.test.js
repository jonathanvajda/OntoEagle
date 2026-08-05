import { mintBundleIri } from '../docs/app/bundler-core.js';

describe('bundler-core.js ontology-utils wiring', () => {
  test('mintBundleIri creates a URN UUID through the promoted identifier utility', () => {
    expect(mintBundleIri()).toMatch(/^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });
});
