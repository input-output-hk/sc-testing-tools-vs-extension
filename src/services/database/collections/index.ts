import { RxDatabase } from 'rxdb';

import {
  packageSchema,
  type PackageCollection,
  type PackageDocument
} from './schemas/package';

import {
  suiteSchema,
  type SuiteCollection,
  type SuiteDocument
} from './schemas/suite';

import {
  testSchema,
  type TestCollection,
  type TestDocument
} from './schemas/test';

import {
  coverageSchema,
  type CoverageCollection,
  type CoverageDocument
} from './schemas/coverage';

import {
  roundSchema,
  type RoundCollection,
  type RoundDocument
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
  SuiteDocument,
  TestDocument,
  CoverageDocument,
  RoundDocument,
};