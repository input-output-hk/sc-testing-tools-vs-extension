import { defineRelations } from 'drizzle-orm';
import * as schema from './schema';

export const relations = defineRelations(schema, r => ({
  runs: {
    results: r.many.results({
      from: r.runs.runId,
      to: r.results.runId,
    })
  },
  results: {
    run: r.one.runs({
      from: r.results.runId,
      to: r.runs.runId,
    }),
    rounds: r.many.rounds({
      from: [
        r.results.runId,
        r.results.workspaceId,
        r.results.packageName,
        r.results.suiteName,
        r.results.testId,
      ],
      to: [
        r.rounds.runId,
        r.rounds.workspaceId,
        r.rounds.packageName,
        r.rounds.suiteName,
        r.rounds.testId,
      ],
    }),
  },
  rounds: {
    run: r.one.runs({
      from: r.rounds.runId,
      to: r.runs.runId,
    }),
    result: r.one.results({
      from: [
        r.rounds.runId,
        r.rounds.workspaceId,
        r.rounds.packageName,
        r.rounds.suiteName,
        r.rounds.testId,
      ],
      to: [
        r.results.runId,
        r.results.workspaceId,
        r.results.packageName,
        r.results.suiteName,
        r.results.testId,
      ],
    }),
  }
}));