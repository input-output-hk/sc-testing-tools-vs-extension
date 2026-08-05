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
  SUITE_ID_MAX_LENGTH,
} from './ids';

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
    id: {
      type: 'string',
      maxLength: SUITE_ID_MAX_LENGTH,
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
    status: {
      type: 'string',
    },
    treeVersion: {
      type: 'number',
      minimum: 0,
      default: 0,
    }
  },
  required: [
    'workspaceId',
    'packageName',
    'suiteName',
    'status',
    'treeVersion',
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
