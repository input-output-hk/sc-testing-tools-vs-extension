import { RxDatabase } from 'rxdb';

import {
  packageSchema,
  type PackageCollection,
  type PackageDocument,
  type PackageDocumentData
} from './schemas/package';

import {
  suiteSchema,
  type SuiteCollection,
  type SuiteDocument,
  type SuiteDocumentData
} from './schemas/suite';

import {
  testSchema,
  type TestCollection,
  type TestDocument,
  type TestDocumentData
} from './schemas/test';

import {
  coverageSchema,
  type CoverageCollection,
  type CoverageDocument,
  type CoverageDocumentData
} from './schemas/coverage';

import {
  roundSchema,
  type RoundCollection,
  type RoundDocument,
  type RoundDocumentData
} from './schemas/round';

export const databaseCollections = {
  packages: {
    schema: packageSchema,
  },
  suites: {
    schema: suiteSchema,
  },
  tests: {
    schema: testSchema,
  },
  coverage: {
    schema: coverageSchema,
  },
  rounds: {
    schema: roundSchema,
  },
};

export type DatabaseCollections = {
  packages: PackageCollection,
  suites: SuiteCollection,
  tests: TestCollection,
  coverage: CoverageCollection,
  rounds: RoundCollection,
};

export type Database = RxDatabase<DatabaseCollections>;

export type {
  PackageDocument,
  PackageDocumentData,
  SuiteDocument,
  SuiteDocumentData,
  TestDocument,
  TestDocumentData,
  CoverageDocument,
  CoverageDocumentData,
  RoundDocument,
  RoundDocumentData,
};