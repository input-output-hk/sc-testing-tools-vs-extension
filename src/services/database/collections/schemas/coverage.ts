import {
  toTypedRxJsonSchema,
  ExtractDocumentTypeFromTypedRxJsonSchema,
  RxJsonSchema,
  RxDocument,
  RxCollection,
} from 'rxdb';

import {
  stringSchema,
  finalStringSchema,
  workspaceIdSchema,
  packageNameSchema,
  suiteNameSchema,
  rangeSchema,
} from '../common/schemas';

const coverageSchemaLiteral = {
  title: 'coverage',
  version: 0,
  primaryKey: 'fileHash',
  type: 'object',
  properties: {
    fileHash: {
      type: 'string',
      maxLength: 64,
      final: true,
    },
    filePath: finalStringSchema,
    context: {
      type: 'object',
      properties: {
        basePath: finalStringSchema,
        workspaceId: workspaceIdSchema,
        packageName: packageNameSchema,
        suiteName: suiteNameSchema,
      },
      required: ['basePath', 'workspaceId', 'packageName', 'suiteName'],
      final: true,
    },
    index: {
      type: 'array',
      items: rangeSchema,
    },
    statements: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          range: rangeSchema,
          testIds: {
            type: 'array',
            items: stringSchema,
          },
        },
        required: ['range', 'testIds'],
      },
    },
  },
  required: [
    'fileHash',
    'filePath',
    'context',
    'index',
    'statements',
  ],
  indexes: [
    ['context.workspaceId', 'context.packageName', 'context.suiteName'],
  ],
} as const;

const schemaTyped = toTypedRxJsonSchema(coverageSchemaLiteral);
type CoverageDocType = ExtractDocumentTypeFromTypedRxJsonSchema<typeof schemaTyped>;
export const coverageSchema: RxJsonSchema<CoverageDocType> = coverageSchemaLiteral;
export type CoverageDocument = RxDocument<CoverageDocType>;
export type CoverageCollection = RxCollection<CoverageDocType>;
