import { describe, expect, test } from 'vitest';
import { getVisibleItems, parseFilterText } from './treeUtils';

/** Builds a test node with the given name, status and type. */
const makeTest = (id: string, name: string, status: RunStatus, type: TestType): TestTreeTestNode => ({
  type: 'test',
  test: {
    id: ['ws', 'pkg', 'suite', id],
    name,
    group: [],
    status,
    type,
    isBuilding: false,
    isWaiting: false,
    isRunning: false,
    isStatic: false,
    hasCoverage: false,
  },
});

const mintValid = makeTest('1', 'mint succeeds', 'valid', 'positive');
const mintInvalid = makeTest('2', 'mint twice', 'invalid', 'negative');
const burnPending = makeTest('3', 'burn token', 'undetermined', 'threat-model');

const mintGroup: TestTreeGroupNode = {
  type: 'group',
  name: 'Mint',
  isOpen: false,
  nodes: { '1': mintValid, '2': mintInvalid },
};

const suite: TestSuite = {
  id: ['ws', 'pkg', 'suite'],
  name: 'token-suite',
  status: 'undetermined',
  isBuilding: false,
  isWaiting: false,
  isRunning: false,
  isStatic: false,
  isOpen: false,
  tests: { Mint: mintGroup, '3': burnPending },
};

const testPackage: TestPackage = {
  id: ['ws', 'pkg'],
  name: 'token-package',
  packagePath: '/pkg',
  workspace: {} as Workspace,
  isOpen: false,
  suites: { suite },
};

const testTree: TestTree = { packages: { pkg: testPackage } };

const items: Record<string, VisibleItem> = { testPackage, suite, mintGroup, mintValid, mintInvalid, burnPending };

/** Returns the fixture names of the items left visible by the filter text, in fixture order. */
const getVisibleNames = (text: string): Array<string> => {
  const visible = getVisibleItems(testTree, { text });
  const names: Array<string> = [];
  for (const [name, item] of Object.entries(items)) {
    if (visible.has(item)) names.push(name);
  }
  return names;
};


const everything = ['testPackage', 'suite', 'mintGroup', 'mintValid', 'mintInvalid', 'burnPending'];

describe('parseFilterText', () => {
  test('splits words by their first character and lowercases them', () => {
    expect(parseFilterText('Mint !Slow @VALID')).toEqual({
      positiveKeywords: ['mint'],
      negativeKeywords: ['slow'],
      tagKeywords: ['valid'],
    });
  });

  test('ignores a lone ! or @', () => {
    expect(parseFilterText('! @')).toEqual({ positiveKeywords: [], negativeKeywords: [], tagKeywords: [] });
  });

  test('treats !@tag as a negative text keyword', () => {
    expect(parseFilterText('!@valid').negativeKeywords).toEqual(['@valid']);
  });

  test('handles missing text', () => {
    expect(parseFilterText(undefined)).toEqual({ positiveKeywords: [], negativeKeywords: [], tagKeywords: [] });
  });
});

describe('getVisibleItems', () => {
  describe('no filter', () => {
    test('shows everything', () => {
      expect(getVisibleNames('')).toEqual(everything);
    });
  });

  describe('plain text keywords', () => {
    test('a word in a test name keeps that test and its parents', () => {
      expect(getVisibleNames('twice')).toEqual(['testPackage', 'suite', 'mintGroup', 'mintInvalid']);
    });

    test('a word in a folder name keeps the whole folder', () => {
      expect(getVisibleNames('mint')).toEqual(['testPackage', 'suite', 'mintGroup', 'mintValid', 'mintInvalid']);
    });

    test('ignores case', () => {
      expect(getVisibleNames('MINT')).toEqual(getVisibleNames('mint'));
    });

    test('every word must match (AND)', () => {
      expect(getVisibleNames('token-suite burn')).toEqual(['testPackage', 'suite', 'burnPending']);
      expect(getVisibleNames('mint burn')).toEqual([]);
    });
  });

  describe('exclusions (!)', () => {
    test('removes a matching test', () => {
      expect(getVisibleNames('!twice')).toEqual(['testPackage', 'suite', 'mintGroup', 'mintValid', 'burnPending']);
    });

    test('removes a matching folder with its subtree', () => {
      expect(getVisibleNames('!mint')).toEqual(['testPackage', 'suite', 'burnPending']);
    });

    test('! wins over a plain word', () => {
      expect(getVisibleNames('mint !mint')).toEqual([]);
    });
  });

  describe('tags (@)', () => {
    test('@valid keeps valid tests', () => {
      expect(getVisibleNames('@valid')).toEqual(['testPackage', 'suite', 'mintGroup', 'mintValid']);
    });

    test('@threat-model keeps threat-model tests', () => {
      expect(getVisibleNames('@threat-model')).toEqual(['testPackage', 'suite', 'burnPending']);
    });

    test('@executed keeps valid and invalid tests', () => {
      expect(getVisibleNames('@executed')).toEqual(['testPackage', 'suite', 'mintGroup', 'mintValid', 'mintInvalid']);
    });

    test('tags combine with AND', () => {
      expect(getVisibleNames('@valid @invalid')).toEqual([]);
    });

    test('a repeated tag acts like one', () => {
      expect(getVisibleNames('@valid @valid')).toEqual(getVisibleNames('@valid'));
    });

    test('unknown or partial tags are ignored', () => {
      expect(getVisibleNames('@vali')).toEqual(everything);
      expect(getVisibleNames('@foo')).toEqual(everything);
    });
  });

  describe('pruning', () => {
    test('hides parents with no visible test left', () => {
      expect(getVisibleNames('nothing-matches')).toEqual([]);
    });
  });
});
