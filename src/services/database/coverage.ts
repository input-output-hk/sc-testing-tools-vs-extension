import {
  toTypedRxJsonSchema,
  ExtractDocumentTypeFromTypedRxJsonSchema,
  RxJsonSchema,
  RxDocument,
  RxCollection,
} from 'rxdb';

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
    fileUri: {
      type: 'string',
      final: true,
    },
    packageName: {
      type: 'string',
    },
    suiteName: {
      type: 'string',
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
              type: 'object',
              properties: {
                workspaceId: { type: 'string' },
                packageName: { type: 'string' },
                suiteName: { type: 'string' },
                testId: { type: 'string' },
              },
              required: ['workspaceId', 'packageName', 'suiteName', 'testId'],
            },
          },
        },
        required: ['range', 'testIds'],
      },
    },
  },
  required: [
    'fileHash',
    'fileUri',
    'packageName',
    'suiteName',
    'statements',
  ],
} as const;

const schemaTyped = toTypedRxJsonSchema(coverageSchemaLiteral);
type CoverageDocType = ExtractDocumentTypeFromTypedRxJsonSchema<typeof schemaTyped>;
export const coverageSchema: RxJsonSchema<CoverageDocType> = coverageSchemaLiteral;
export type CoverageDocument = RxDocument<CoverageDocType>;
export type CoverageCollection = RxCollection<CoverageDocType>;
