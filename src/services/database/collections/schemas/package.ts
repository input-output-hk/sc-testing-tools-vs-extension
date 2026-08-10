import {
  toTypedRxJsonSchema,
  ExtractDocumentTypeFromTypedRxJsonSchema,
  RxJsonSchema,
  RxDocument,
  RxCollection,
} from 'rxdb';

import {
  finalStringSchema,
  workspaceIdSchema,
  packageNameSchema,
  packageIdSchema,
} from '../common/schemas';

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
    id: packageIdSchema,
    workspaceId: workspaceIdSchema,
    workspacePath: finalStringSchema,
    packageName: packageNameSchema,
    packagePath: finalStringSchema,
  },
  required: [
    'id',
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
