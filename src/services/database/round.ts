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
  TEST_ROUND_MAX_LENGTH,
  TEST_ROUND_ID_MAX_LENGTH,
} from './ids';

const roundSchemaLiteral = {
  title: 'round',
  version: 0,
  primaryKey: {
    key: 'id',
    fields: ['workspaceId', 'packageName', 'suiteName', 'testId', 'roundId'],
    separator: ':',
  },
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: TEST_ROUND_ID_MAX_LENGTH,
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
    roundId: {
      type: 'string',
      maxLength: TEST_ROUND_MAX_LENGTH,
      final: true,
    },
    status: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
        },
        message: {
          type: 'string',
        },
      },
      required: ['status'],
    },
    transitions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
          },
          result: {
            type: 'object',
            properties: {
              status: {
                type: 'string',
              },
              txId: {
                type: 'string',
              },
              error: {
                type: 'string',
              },
            },
            required: ['status'],
          },
          stepIndex: {
            type: 'number',
          },
        },
        required: ['action', 'result', 'stepIndex'],
      },
    },
  },
  required: [
    'workspaceId',
    'packageName',
    'suiteName',
    'testId',
    'roundId',
    'status',
    'transitions',
  ],
  indexes: [
    ['workspaceId', 'packageName', 'suiteName', 'testId'],
    ['workspaceId', 'packageName', 'suiteName', 'testId', 'status.status'],
  ],
} as const;

const schemaTyped = toTypedRxJsonSchema(roundSchemaLiteral);
type RoundDocType = ExtractDocumentTypeFromTypedRxJsonSchema<typeof schemaTyped>;
export const roundSchema: RxJsonSchema<RoundDocType> = roundSchemaLiteral;
export type RoundDocument = RxDocument<RoundDocType>;
export type RoundCollection = RxCollection<RoundDocType>;
