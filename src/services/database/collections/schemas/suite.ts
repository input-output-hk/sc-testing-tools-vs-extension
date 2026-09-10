import {
  toTypedRxJsonSchema,
  ExtractDocumentTypeFromTypedRxJsonSchema,
  RxJsonSchema,
  RxDocument,
  RxCollection,
} from 'rxdb';

import {
  booleanSchema,
  numberSchema,
  stringSchema,
  suiteIdSchema,
  workspaceIdSchema,
  packageNameSchema,
  suiteNameSchema,
} from '../common/schemas';

const suiteSchemaLiteral = {
  title: 'suite',
  version: 0,
  primaryKey: {
    key: 'id',
    fields: ['workspaceId', 'packageName', 'suiteName'],
    separator: ':',
  },
  type: 'object',
  properties: {
    id: suiteIdSchema,
    workspaceId: workspaceIdSchema,
    packageName: packageNameSchema,
    suiteName: suiteNameSchema,
    status: stringSchema,
    isWaiting: booleanSchema,
    isRunning: booleanSchema,
    isStatic: booleanSchema,
    time: numberSchema,
    treeVersion: {
      type: 'number',
      minimum: 0,
      default: 0,
    }
  },
  required: [
    'id',
    'workspaceId',
    'packageName',
    'suiteName',
    'status',
    'isWaiting',
    'isRunning',
    'isStatic',
    'treeVersion',
  ],
} as const;

const schemaTyped = toTypedRxJsonSchema(suiteSchemaLiteral);
type SuiteDocType = ExtractDocumentTypeFromTypedRxJsonSchema<typeof schemaTyped>;
export const suiteSchema: RxJsonSchema<SuiteDocType> = suiteSchemaLiteral;
export type SuiteDocument = RxDocument<SuiteDocType>;
export type SuiteDocumentData = SuiteDocType;
export type SuiteCollection = RxCollection<SuiteDocType>;
