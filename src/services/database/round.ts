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

const stringSchema = {
  type: 'string',
} as const;

const numberSchema = {
  type: 'number',
} as const;

const valueSchema = {
  type: 'object',
  properties: {
    lovelace: numberSchema,
    assets: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: stringSchema,
          policyId: stringSchema,
          quantity: numberSchema,
        },
        required: ['policyId', 'assetName', 'quantity'],
      },
    },
  },
  required: ['lovelace', 'assets'],
} as const;

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
        status: stringSchema,
        message: stringSchema,
      },
      required: ['status'],
    },
    transitions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          action: stringSchema,
          result: {
            type: 'object',
            properties: {
              status: stringSchema,
              txId: stringSchema,
              error: stringSchema,
            },
            required: ['status'],
          },
          stepIndex: numberSchema,
          tx: {
            type: 'object',
            properties: {
              id: stringSchema,
              fee: numberSchema,
              inputs: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    address: stringSchema,
                    utxo: stringSchema,
                    value: valueSchema,
                    redeemerConstr: numberSchema,
                    redeemerKind: stringSchema,
                    redeemerPayload: { type: 'object' },
                    redeemerRaw: stringSchema,
                  },
                  required: ['address', 'utxo', 'value'],
                },
              },
              outputs: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    address: stringSchema,
                    utxo: stringSchema,
                    value: valueSchema,
                    datum: stringSchema,
                  },
                  required: ['address', 'utxo', 'value'],
                },
              },
              mint: valueSchema,
              signers: {
                type: 'array',
                items: stringSchema
              },
            },
            required: ['fee', 'inputs', 'outputs'],
          }
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
