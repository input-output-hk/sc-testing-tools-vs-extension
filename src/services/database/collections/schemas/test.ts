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
  rangeSchema,
  testIdSchema,
  fullTestIdSchema,
  workspaceIdSchema,
  packageNameSchema,
  suiteNameSchema,
} from '../common/schemas';

const testSchemaLiteral = {
  title: 'test',
  version: 0,
  primaryKey: {
    key: 'id',
    fields: ['workspaceId', 'packageName', 'suiteName', 'testId'],
    separator: ':',
  },
  type: 'object',
  properties: {
    id: fullTestIdSchema,
    workspaceId: workspaceIdSchema,
    packageName: packageNameSchema,
    suiteName: suiteNameSchema,
    testId: testIdSchema,
    name: stringSchema,
    group: {
      type: 'array',
      items: stringSchema
    },
    status: stringSchema,
    type: stringSchema,
    location: {
      type: 'object',
      properties: {
        uri: stringSchema,
        range: rangeSchema,
      },
      required: ['uri', 'range'],
    },
    time: numberSchema,
    percentage: {
      type: 'number',
      minimum: 0,
      maximum: 100,
    },
  },
  required: [
    'id',
    'workspaceId',
    'packageName',
    'suiteName',
    'testId',
    'name',
    'group',
    'status',
  ],
  indexes: [
    'workspaceId',
    ['workspaceId', 'packageName'],
    ['workspaceId', 'packageName', 'suiteName'],
  ],
} as const;

const schemaTyped = toTypedRxJsonSchema(testSchemaLiteral);
type TestDocType = ExtractDocumentTypeFromTypedRxJsonSchema<typeof schemaTyped>;
export const testSchema: RxJsonSchema<TestDocType> = testSchemaLiteral;
export type TestDocument = RxDocument<TestDocType>;
export type TestCollection = RxCollection<TestDocType>;
