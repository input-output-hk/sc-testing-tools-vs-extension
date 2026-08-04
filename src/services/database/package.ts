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
  PACKAGE_ID_MAX_LENGTH,
} from './ids';

const packageSchemaLiteral = {
  title: 'package',
  version: 0,
  primaryKey: {
    key: 'id',
    fields: ['workspaceId', 'packageName'],
    separator: ':',
  },
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: PACKAGE_ID_MAX_LENGTH,
      final: true,
    },
    workspaceId: {
      type: 'string',
      maxLength: WORKSPACE_ID_MAX_LENGTH,
      final: true,
    },
    workspacePath: {
      type: 'string',
      final: true,
    },
    packageName: {
      type: 'string',
      maxLength: PACKAGE_NAME_MAX_LENGTH,
      final: true,
    },
    packagePath: {
      type: 'string',
      final: true,
    },
  },
  required: [
    'workspaceId',
    'workspacePath',
    'packageName',
    'packagePath',
  ],
  indexes: [
    'workspaceId',
  ]
} as const;

const schemaTyped = toTypedRxJsonSchema(packageSchemaLiteral);
type PackageDocType = ExtractDocumentTypeFromTypedRxJsonSchema<typeof schemaTyped>;
export const packageSchema: RxJsonSchema<PackageDocType> = packageSchemaLiteral;
export type PackageDocument = RxDocument<PackageDocType>;
export type PackageCollection = RxCollection<PackageDocType>;
