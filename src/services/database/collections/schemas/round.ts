import {
  toTypedRxJsonSchema,
  ExtractDocumentTypeFromTypedRxJsonSchema,
  RxJsonSchema,
  RxDocument,
  RxCollection,
} from 'rxdb';

import {
  numberSchema,
  stringSchema,
  testRoundSchema,
  testRoundIdSchema,
  workspaceIdSchema,
  packageNameSchema,
  suiteNameSchema,
  testIdSchema,
} from '../common/schemas';

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
        required: ['policyId', 'name', 'quantity'],
      },
    },
  },
  required: ['lovelace', 'assets'],
} as const;

const txSchema = {
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
} as const;

const transitionSchema = {
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
    tx: txSchema,
  },
  required: ['action', 'result', 'stepIndex'],
} as const;

const traceSchema = {
  type: 'object',
  properties: {
    tx: txSchema,
    modifiedTx: txSchema,
    modifications: {
      type: 'array',
      items: { type: 'object' },
    },
    outcome: {
      type: 'object',
      properties: {
        status: stringSchema,
        reason: stringSchema,
        message: stringSchema,
      },
      required: ['status'],
    },
    targetTxIndex: numberSchema,
  },
  required: ['tx', 'modifications', 'outcome', 'targetTxIndex'],
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
    id: testRoundIdSchema,
    workspaceId: workspaceIdSchema,
    packageName: packageNameSchema,
    suiteName: suiteNameSchema,
    testId: testIdSchema,
    roundId: testRoundSchema,
    status: {
      type: 'object',
      properties: {
        status: stringSchema,
        message: stringSchema,
      },
      required: ['status'],
    },
    type: stringSchema,
    transitions: {
      type: 'array',
      items: transitionSchema,
    },
    threatModelTestIds: {
      type: 'array',
      items: stringSchema,
    },
    parentTestId: stringSchema,
    traces: {
      type: 'array',
      items: traceSchema,
    },
  },
  required: [
    'id',
    'workspaceId',
    'packageName',
    'suiteName',
    'testId',
    'roundId',
    'status',
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
