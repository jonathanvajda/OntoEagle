// tests/normalize.test.js
import {
  normalizeText,
  tokenizeForIndex,
  tokenizeQuery,
  normalizeQuery
} from '../docs/app/normalize.js';

describe('normalize.js', () => {
  test('normalizeText lowercases and collapses whitespace', () => {
    expect(normalizeText('  Vehicle   Class  ')).toBe('vehicle class');
  });

  test('normalizeText converts smart quotes (using unicode escapes)', () => {
    const leftDouble = '\u201C';  // “
    const rightDouble = '\u201D'; // ”
    const rightSingle = '\u2019'; // ’

    expect(normalizeText(`${leftDouble}Act of Location Change${rightDouble}`))
      .toBe('"act of location change"');

    expect(normalizeText(`Joseph${rightSingle}s`))
      .toBe("joseph's");
  });

  test('normalizeText preserves ontology-friendly tokens', () => {
    expect(normalizeText('IAO_0000115')).toBe('iao_0000115');
    expect(normalizeText('cco:Person')).toBe('cco:person');
    expect(normalizeText('http://example.org/ont#Vehicle')).toBe('http://example.org/ont#vehicle');
  });

  test('tokenizeForIndex splits into whitespace tokens', () => {
    expect(tokenizeForIndex('Vehicle hasPart cco:Person'))
      .toEqual(['vehicle', 'haspart', 'cco:person']);
  });

  test('tokenizeQuery respects quoted phrases', () => {
    expect(tokenizeQuery('vehicle "act of location change" IAO_0000115'))
      .toEqual(['vehicle', 'act of location change', 'iao_0000115']);
  });

  test('normalizeQuery dedupes tokens and keeps phrases intact', () => {
    expect(normalizeQuery('Vehicle vehicle "Act of Location Change" "Act of Location Change"'))
      .toEqual(['vehicle', 'act of location change']);
  });

  test('tokenizeQuery handles empty/whitespace safely', () => {
    expect(tokenizeQuery('   ')).toEqual([]);
    expect(normalizeQuery('')).toEqual([]);
  });

  test('normalizeText strips most punctuation but keeps selected symbols', () => {
    // Keeps: _ : / - . ' " @ #
    expect(normalizeText('cco:Person, IAO_0000115; http://x.org/a-b.c#D @tag #hash'))
      .toBe('cco:person iao_0000115 http://x.org/a-b.c#d @tag #hash');
  });
});
