
type FilterTagGroup = 'status' | 'type';

export type FilterTag = {
  name: string;
  description: string;
  group?: FilterTagGroup;
  matches: (test: Test) => boolean;
};

/** Returns a matcher that keeps tests with the given run status. */
const hasStatus = (status: RunStatus) => (test: Test): boolean => test.status === status;

/** Returns a matcher that keeps tests of the given test type. */
const hasType = (type: TestType) => (test: Test): boolean => test.type === type;

/** Keeps tests that ran and have a result. `undetermined` means the test didn't run. */
const isExecuted = (test: Test): boolean => test.status === 'valid' || test.status === 'invalid';

/** The only tags the filter knows: the filter menu options, plus `@executed`. */
export const FILTER_TAGS: Array<FilterTag> = [
  { name: 'undetermined', description: 'Show Undetermined Tests', group: 'status', matches: hasStatus('undetermined') },
  { name: 'valid', description: 'Show Valid Tests', group: 'status', matches: hasStatus('valid') },
  { name: 'invalid', description: 'Show Invalid Tests', group: 'status', matches: hasStatus('invalid') },
  { name: 'positive', description: 'Show Positive Tests', group: 'type', matches: hasType('positive') },
  { name: 'negative', description: 'Show Negative Tests', group: 'type', matches: hasType('negative') },
  { name: 'threat-model', description: 'Show Threat Models', group: 'type', matches: hasType('threat-model') },
  { name: 'unit-test', description: 'Show Non-Testing Interface Tests', group: 'type', matches: hasType('unit-test') },
  { name: 'executed', description: 'Show Executed Tests', matches: isExecuted },
];

/** Returns the known tags among the parsed tag keywords. Unknown or partial tags are ignored. */
export const getKnownTags = (tagKeywords: Array<string>): Array<FilterTag> => {
  const tags: Array<FilterTag> = [];
  for (const tag of FILTER_TAGS) {
    if (tagKeywords.includes(tag.name)) tags.push(tag);
  }
  return tags;
};

/** Returns the index where the word at the cursor starts (just after the previous whitespace). */
const getWordStart = (text: string, cursor: number): number => {
  let start = cursor;
  while (start > 0 && !/\s/.test(text[start - 1])) start--;
  return start;
};

/**
 * Returns what the user typed after `@` when the word at the cursor (up to the cursor) starts with `@`, otherwise null.
 * @example getTagQuery('foo @va', 7) // 'va'
 * @example getTagQuery('foo@va', 6) // null
 */
export const getTagQuery = (text: string, cursor: number): string | null => {
  const word = text.slice(getWordStart(text, cursor), cursor);
  return word.startsWith('@') ? word.slice(1).toLowerCase() : null;
};

/** Returns the tags whose name starts with the query. */
export const getTagSuggestions = (query: string): Array<FilterTag> => {
  const tags: Array<FilterTag> = [];
  for (const tag of FILTER_TAGS) {
    if (tag.name.startsWith(query)) tags.push(tag);
  }
  return tags;
};

/**
 * Replaces the text from the start of the word at the cursor up to the cursor with the tag and a space.
 * Text after the cursor is kept. Returns the new text and the cursor position after the tag and its space.
 * @example insertTag('foo @va bar', 7, 'valid') // { text: 'foo @valid bar', cursor: 11 }
 */
export const insertTag = (text: string, cursor: number, tagName: string): { text: string; cursor: number } => {
  const before = text.slice(0, getWordStart(text, cursor)) + '@' + tagName;
  const after = text.slice(cursor);
  const separator = /^\s/.test(after) ? '' : ' ';
  return { text: before + separator + after, cursor: before.length + 1 };
};

/** Returns a predicate that finds the tag with the given name. */
const isTagNamed = (tagName: string) => (tag: FilterTag): boolean => tag.name === tagName;

/** Returns a predicate that checks whether a word is the given tag, ignoring case. */
const isWordForTag = (tagName: string) => (word: string): boolean => word.toLowerCase() === '@' + tagName;

/** Returns a predicate that finds the tag the word stands for, ignoring case. */
const isTagForWord = (word: string) => (tag: FilterTag): boolean => word.toLowerCase() === '@' + tag.name;

/**
 * Adds the tag to the text, or removes it if it's already there. Adding a tag removes the other tags of its group,
 * so the filter menu stays single-select per group.
 */
export const toggleTag = (text: string, tagName: string): string => {
  const tag = FILTER_TAGS.find(isTagNamed(tagName));
  const words = text.split(/\s+/);
  const isActive = words.some(isWordForTag(tagName));
  const kept: Array<string> = [];
  for (const word of words) {
    const wordTag = FILTER_TAGS.find(isTagForWord(word));
    const isSameTag = wordTag?.name === tagName;
    const isSameGroup = !isActive && wordTag?.group !== undefined && wordTag.group === tag?.group;
    if (word !== '' && !isSameTag && !isSameGroup) kept.push(word);
  }
  if (!isActive) kept.push('@' + tagName);
  return kept.join(' ');
};
