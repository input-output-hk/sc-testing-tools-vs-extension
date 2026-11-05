import { describe, expect, test } from 'vitest';
import { getKnownTags, getTagQuery, getTagSuggestions, insertTag, toggleTag, type FilterTag } from './filterTags';

/** Returns the name of a tag. */
const getTagName = (tag: FilterTag): string => tag.name;

describe('getKnownTags', () => {
  test('keeps known tags and ignores unknown or partial ones', () => {
    expect(getKnownTags(['valid', 'vali', 'foo', 'executed']).map(getTagName)).toEqual(['valid', 'executed']);
  });
});

describe('getTagQuery', () => {
  test('returns the text after @', () => {
    expect(getTagQuery('foo @va', 7)).toBe('va');
  });

  test('returns an empty query for a lone @', () => {
    expect(getTagQuery('@', 1)).toBe('');
  });

  test('lowercases the query', () => {
    expect(getTagQuery('@VA', 3)).toBe('va');
  });

  test('ignores @ in the middle of a word', () => {
    expect(getTagQuery('foo@va', 6)).toBeNull();
  });

  test('ignores a word starting with !', () => {
    expect(getTagQuery('!@va', 4)).toBeNull();
  });

  test('only looks at the word at the cursor', () => {
    expect(getTagQuery('@va bar', 7)).toBeNull();
  });
});

describe('getTagSuggestions', () => {
  test('suggests every tag for an empty query', () => {
    expect(getTagSuggestions('').map(getTagName)).toEqual([
      'undetermined', 'valid', 'invalid', 'positive', 'negative', 'threat-model', 'unit-test', 'executed',
    ]);
  });

  test('suggests tags starting with the query', () => {
    expect(getTagSuggestions('va').map(getTagName)).toEqual(['valid']);
  });

  test('suggests nothing when no tag matches', () => {
    expect(getTagSuggestions('@val')).toEqual([]);
  });
});

describe('insertTag', () => {
  test('inserts the tag before the text after the cursor', () => {
    expect(insertTag('@bar', 1, 'valid')).toEqual({ text: '@valid bar', cursor: 7 });
  });

  test('replaces only up to the cursor', () => {
    expect(insertTag('@val', 3, 'valid')).toEqual({ text: '@valid l', cursor: 7 });
  });

  test('does not add a space when one already follows', () => {
    expect(insertTag('foo @va bar', 7, 'valid')).toEqual({ text: 'foo @valid bar', cursor: 11 });
  });

  test('adds a space at the end of the text', () => {
    expect(insertTag('foo @va', 7, 'valid')).toEqual({ text: 'foo @valid ', cursor: 11 });
  });
});

describe('toggleTag', () => {
  test('adds the tag', () => {
    expect(toggleTag('', 'valid')).toBe('@valid');
    expect(toggleTag('mint', 'valid')).toBe('mint @valid');
  });

  test('removes an active tag, ignoring case', () => {
    expect(toggleTag('mint @valid', 'valid')).toBe('mint');
    expect(toggleTag('@VALID mint', 'valid')).toBe('mint');
  });

  test('replaces the other tag of the same group', () => {
    expect(toggleTag('@valid mint', 'invalid')).toBe('mint @invalid');
    expect(toggleTag('@positive @valid', 'negative')).toBe('@valid @negative');
  });

  test('keeps tags of other groups', () => {
    expect(toggleTag('@valid @executed', 'positive')).toBe('@valid @executed @positive');
  });
});
