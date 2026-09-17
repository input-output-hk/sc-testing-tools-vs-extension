import {
  text,
  integer,
  primaryKey,
  sqliteTable
} from 'drizzle-orm/sqlite-core';

export const runs = sqliteTable('runs', {
  runId: text('run_id').primaryKey(),
  status: text('status', { enum: ['running', 'success', 'failed'] }).notNull().$type<TestJobStatus>(),
  startedOn: integer('started_on').notNull(),
  finishedOn: integer('finished_on'),
});

export const results = sqliteTable('results', {
  runId: text('run_id').notNull(),
  workspaceId: text('workspace_id').notNull(),
  packageName: text('package_name').notNull(),
  suiteName: text('suite_name').notNull(),
  testId: text('test_id').notNull(),
  time: integer('time'),
  status: text('status', { enum: ['valid', 'invalid'] }).notNull().$type<RunStatus>(),
  type: text('type', { enum: ['unit-test', 'positive', 'negative', 'threat-model'] }).$type<TestType>(),
}, table => [
  primaryKey({
    columns: [
      table.runId,
      table.workspaceId,
      table.packageName,
      table.suiteName,
      table.testId
    ]
  })
]);

export const rounds = sqliteTable('rounds', {
  runId: text('run_id').notNull(),
  workspaceId: text('workspace_id').notNull(),
  packageName: text('package_name').notNull(),
  suiteName: text('suite_name').notNull(),
  testId: text('test_id').notNull(),
  roundId: integer('round_id').notNull(),
  type: text('type', { enum: ['positive', 'negative', 'threat-model'] }).notNull().$type<TestRoundType>(),
  status: text('status', { enum: ['success', 'failure', 'discarded'] }).notNull().$type<TestRoundStatus>(),
  data: text('data', { mode: 'json' }).notNull().$type<TestRoundData>(),
}, table => [
  primaryKey({
    columns: [
      table.runId,
      table.workspaceId,
      table.packageName,
      table.suiteName,
      table.testId,
      table.roundId
    ]
  })
]);