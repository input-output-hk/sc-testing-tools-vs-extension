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

const addressTypeSchema = {
  type: 'string',
  enum: ['public-key', 'script'],
} as const;

const testRoundStatusSchema = {
  type: 'string',
  enum: ['success', 'failure', 'discarded'],
} as const;

const testRoundTypeSchema = {
  type: 'string',
  enum: ['positive', 'negative', 'threat-model'],
} as const;

const transitionResultStatusSchema = {
  type: 'string',
  enum: ['success', 'failure'],
} as const;

const threatModelOutcomeStatusSchema = {
  type: 'string',
  enum: ['passed', 'failed', 'skipped', 'skipped_phase1', 'error'],
} as const;

const txModTypeSchema = {
  type: 'string',
  enum: [
    'removeInput',
    'removeOutput',
    'changeOutput',
    'changeInput',
    'changeScriptInput',
    'changeValidityRange',
    'addOutput',
    'addInput',
    'addReferenceScriptInput',
    'addPlutusScriptInput',
    'addPlutusScriptReferenceInput',
    'addSimpleScriptInput',
    'addPlutusScriptMint',
    'removeRequiredSigner',
    'replaceTx',
  ],
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
          addressLabel: stringSchema,
          addressType: addressTypeSchema,
          utxo: stringSchema,
          value: valueSchema,
          redeemerConstr: numberSchema,
          redeemerKind: stringSchema,
          redeemerPayload: { type: 'object' },
          redeemerRaw: stringSchema,
        },
        required: ['address', 'addressType', 'utxo', 'value'],
      },
    },
    outputs: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: numberSchema,
          address: stringSchema,
          addressLabel: stringSchema,
          addressType: addressTypeSchema,
          utxo: stringSchema,
          value: valueSchema,
          datum: stringSchema,
        },
        required: ['index', 'address', 'addressType', 'utxo', 'value'],
      },
    },
    mint: valueSchema,
    signers: {
      type: 'array',
      items: stringSchema
    },
    withdrawals: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          addressLabel: stringSchema,
          addressType: addressTypeSchema,
          amount: numberSchema,
          redeemerConstr: numberSchema,
          redeemerKind: stringSchema,
          redeemerPayload: { type: 'object' },
          redeemerRaw: stringSchema,
          stakeAddress: stringSchema,
        },
        required: ['addressType', 'amount', 'stakeAddress'],
      },
    },
  },
  required: ['fee', 'inputs', 'outputs', 'withdrawals'],
} as const;

const transitionSchema = {
  type: 'object',
  properties: {
    action: stringSchema,
    result: {
      type: 'object',
      properties: {
        status: transitionResultStatusSchema,
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
      items: {
        type: 'object',
        properties: {
          type: txModTypeSchema,
        },
        required: ['type'],
      },
    },
    outcome: {
      type: 'object',
      properties: {
        status: threatModelOutcomeStatusSchema,
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
        status: testRoundStatusSchema,
        message: stringSchema,
      },
      required: ['status'],
    },
    type: testRoundTypeSchema,
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
  ],
} as const;

const schemaTyped = toTypedRxJsonSchema(roundSchemaLiteral);
type RoundDocType = ExtractDocumentTypeFromTypedRxJsonSchema<typeof schemaTyped>;
export const roundSchema: RxJsonSchema<RoundDocType> = roundSchemaLiteral;
export type RoundDocument = RxDocument<RoundDocType>;
export type RoundDocumentData = RoundDocType;
export type RoundCollection = RxCollection<RoundDocType>;
