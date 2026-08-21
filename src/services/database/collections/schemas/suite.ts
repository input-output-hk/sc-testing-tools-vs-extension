import {
  toTypedRxJsonSchema,
  ExtractDocumentTypeFromTypedRxJsonSchema,
  RxJsonSchema,
  RxDocument,
  RxCollection,
} from 'rxdb';

import {
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
  },
  required: [
    'id',
    'workspaceId',
    'packageName',
    'suiteName',
    'status',
  ],
  indexes: [
    'workspaceId',
    ['workspaceId', 'packageName'],
    'status',
  ]
} as const;

const schemaTyped = toTypedRxJsonSchema(suiteSchemaLiteral);
type SuiteDocType = ExtractDocumentTypeFromTypedRxJsonSchema<typeof schemaTyped>;
export const suiteSchema: RxJsonSchema<SuiteDocType> = suiteSchemaLiteral;
export type SuiteDocument = RxDocument<SuiteDocType>;
export type SuiteCollection = RxCollection<SuiteDocType>;
