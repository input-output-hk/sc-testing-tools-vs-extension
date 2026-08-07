import {
  WORKSPACE_ID_MAX_LENGTH,
  PACKAGE_NAME_MAX_LENGTH,
  PACKAGE_ID_MAX_LENGTH,
  SUITE_NAME_MAX_LENGTH,
  SUITE_ID_MAX_LENGTH,
  TEST_ID_MAX_LENGTH,
  FULL_TEST_ID_MAX_LENGTH,
  TEST_ROUND_MAX_LENGTH,
  TEST_ROUND_ID_MAX_LENGTH,
} from '../common/constants';

export const numberSchema = {
  type: 'number',
} as const;

export const stringSchema = {
  type: 'string',
} as const;

export const finalStringSchema = {
  type: 'string',
  final: true,
} as const;

export const workspaceIdSchema = {
  type: 'string',
  maxLength: WORKSPACE_ID_MAX_LENGTH,
  final: true,
} as const;

export const packageNameSchema = {
  type: 'string',
  maxLength: PACKAGE_NAME_MAX_LENGTH,
  final: true,
} as const;

export const packageIdSchema = {
  type: 'string',
  maxLength: PACKAGE_ID_MAX_LENGTH,
  final: true,
} as const;

export const suiteNameSchema = {
  type: 'string',
  maxLength: SUITE_NAME_MAX_LENGTH,
  final: true,
} as const;

export const suiteIdSchema = {
  type: 'string',
  maxLength: SUITE_ID_MAX_LENGTH,
  final: true,
} as const;

export const testIdSchema = {
  type: 'string',
  maxLength: TEST_ID_MAX_LENGTH,
  final: true,
} as const;

export const fullTestIdSchema = {
  type: 'string',
  maxLength: FULL_TEST_ID_MAX_LENGTH,
  final: true,
} as const;

export const testRoundSchema = {
  type: 'string',
  maxLength: TEST_ROUND_MAX_LENGTH,
  final: true,
} as const;

export const testRoundIdSchema = {
  type: 'string',
  maxLength: TEST_ROUND_ID_MAX_LENGTH,
  final: true,
} as const;

export const positionSchema = {
  type: 'object',
  properties: {
    line: numberSchema,
    character: numberSchema,
  },
  required: ['line', 'character'],
} as const;

export const rangeSchema = {
  type: 'object',
  properties: {
    start: positionSchema,
    end: positionSchema,
  },
  required: ['start', 'end'],
} as const;