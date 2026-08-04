import {
  toTypedRxJsonSchema,
  ExtractDocumentTypeFromTypedRxJsonSchema,
  RxJsonSchema,
  RxDocument,
  RxCollection,
} from 'rxdb';

import {
  WORKSPACE_ID_MAX_LENGTH,
  PACKAGE_NAME_MAX_LENGTH,
  SUITE_NAME_MAX_LENGTH,
  TEST_ID_MAX_LENGTH,
  FULL_TEST_ID_MAX_LENGTH,
} from './ids';

const testSchemaLiteral = {
  title: 'test',
  version: 0,
  primaryKey: {
    key: 'id',
    fields: ['workspaceId', 'packageName', 'suiteName', 'testId'],
    separator: ':',
  },
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: FULL_TEST_ID_MAX_LENGTH,
      final: true,
    },
    workspaceId: {
      type: 'string',
      maxLength: WORKSPACE_ID_MAX_LENGTH,
      final: true,
    },
    packageName: {
      type: 'string',
      maxLength: PACKAGE_NAME_MAX_LENGTH,
      final: true,
    },
    suiteName: {
      type: 'string',
      maxLength: SUITE_NAME_MAX_LENGTH,
      final: true,
    },
    testId: {
      type: 'string',
      maxLength: TEST_ID_MAX_LENGTH,
      final: true,
    },
    name: {
      type: 'string',
    },
    group: {
      type: 'array',
      items: {
        type: 'string',
      }
    },
    status: {
      type: 'string',
    },
    location: {
      type: 'object',
      properties: {
        uri: {
          type: 'string',
        },
        range: {
          type: 'object',
          properties: {
            start: {
              type: 'object',
              properties: {
                line: { type: 'number' },
                character: { type: 'number' },
              },
              required: ['line', 'character'],
            },
            end: {
              type: 'object',
              properties: {
                line: { type: 'number' },
                character: { type: 'number' },
              },
              required: ['line', 'character'],
            },
          },
          required: ['start', 'end'],
        },
      },
      required: ['uri', 'range'],
    },
    time: {
      type: 'number',
    },
    percentage: {
      type: 'number',
      minimum: 0,
      maximum: 100,
    },
  },
  required: [
    'workspaceId',
    'packageName',
    'suiteName',
    'testId',
    'name',
    'group',
    'status',
  ],
  indexes: [
    'workspaceId',
    ['workspaceId', 'packageName'],
    ['workspaceId', 'packageName', 'suiteName'],
    'status',
  ],
} as const;

const schemaTyped = toTypedRxJsonSchema(testSchemaLiteral);
type TestDocType = ExtractDocumentTypeFromTypedRxJsonSchema<typeof schemaTyped>;
export const testSchema: RxJsonSchema<TestDocType> = testSchemaLiteral;
export type TestDocument = RxDocument<TestDocType>;
export type TestCollection = RxCollection<TestDocType>;
