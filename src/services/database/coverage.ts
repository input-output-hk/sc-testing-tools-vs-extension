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
} from './ids';

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
    filePath: {
      type: 'string',
      final: true,
    },
    context: {
      type: 'object',
      properties: {
        basePath: {
          type: 'string',
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
      },
      required: ['basePath', 'workspaceId', 'packageName', 'suiteName'],
      final: true,
    },
    statements: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          range: {
            type: 'object',
            properties: {
              start: {
                type: 'object',
                properties: {
                  line: { type: 'number' },
                  character: { type: 'number' },
                },
                required: ['line', 'character'],
              },
              end: {
                type: 'object',
                properties: {
                  line: { type: 'number' },
                  character: { type: 'number' },
                },
                required: ['line', 'character'],
              },
            },
            required: ['start', 'end'],
          },
          testIds: {
            type: 'array',
            items: {
              type: 'string',
            },
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
