import os from 'os';
import fs from 'fs';
import path from 'path';
import { eq, and } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { migrate } from 'drizzle-orm/node-sqlite/migrator';

import { runs, results, rounds } from './schema';
import { relations } from './relations';

const DATABASE_DIRECTORY = `${os.homedir()}/.pbt`;
const DATABASE_PATH = `${DATABASE_DIRECTORY}/sqlite.db`;
const MIGRATIONS_PATH = path.resolve(__dirname, '../../../drizzle');

fs.mkdirSync(DATABASE_DIRECTORY, { recursive: true });

export default class History {
  private db = drizzle(DATABASE_PATH, { relations });

  constructor() {
    migrate(this.db, { migrationsFolder: MIGRATIONS_PATH });
  }

  private async upsertTestRun(testJob: TestJob): Promise<void> {
    await this.db.insert(runs)
      .values({
        runId: testJob.id,
        status: testJob.status,
        startedOn: testJob.startedOn!,
        finishedOn: testJob.finishedOn,
      })
      .onConflictDoUpdate({
        target: runs.runId,
        set: {
          status: testJob.status,
          startedOn: testJob.startedOn!,
          finishedOn: testJob.finishedOn,
        }
      });
  }

  private async upsertTestResult(runId: string, test: Test): Promise<void> {
    const [workspaceId, packageName, suiteName, testId] = test.id;
    await this.db.insert(results)
      .values({
        runId,
        workspaceId,
        packageName,
        suiteName,
        testId,
        type: test.type,
        status: test.status,
        group: test.group,
        time: test.time,
      })
      .onConflictDoUpdate({
        target: [
          results.runId,
          results.workspaceId,
          results.packageName,
          results.suiteName,
          results.testId
        ],
        set: {
          type: test.type,
          status: test.status,
          group: test.group,
          time: test.time,
        }
      });
  }

  private async upsertTestRound(runId: string, round: TestRound): Promise<void> {
    const [workspaceId, packageName, suiteName, testId] = round.testId;
    
    const data: TestRoundData = {};
    if (round.type === 'negative' || round.type === 'positive') {
      data.transitions = (round as TransitionTestRound).transitions;
    }
    if (round.type === 'threat-model') {
      data.traces = (round as ThreatModelTestRound).traces;
    }

    await this.db.insert(rounds)
      .values({
        runId,
        workspaceId,
        packageName,
        suiteName,
        testId,
        roundId: round.id,
        type: round.type,
        status: round.status,
        data
      })
      .onConflictDoUpdate({
        target: [
          rounds.runId,
          rounds.workspaceId,
          rounds.packageName,
          rounds.suiteName,
          rounds.testId,
          rounds.roundId
        ],
        set: {
          type: round.type,
          status: round.status,
          data
        }
      });
  }

  public async handleTestSuiteUpdateEvent(event: TestSuiteUpdateEvent): Promise<void> {
    if (event.payload.runStatus !== 'idle' && event.payload.tests) {
      for (const test of event.payload.tests) {
        if (!test.isStatic) {
          await this.upsertTestResult(event.testJobId, test);
        }
      }
    }
  }

  public async handleTestUpdateEvent(event: TestUpdateEvent, test: Test): Promise<void> {    
    if (event.payload.time !== undefined) test.time = event.payload.time;
    if (event.payload.status !== undefined) test.status = event.payload.status;
    if (event.payload.type !== undefined) test.type = event.payload.type;

    await this.upsertTestResult(event.testJobId, test);
  }

  public async handleTestContextEvent(event: TestContextEvent, test: Test): Promise<void> {
    if (event.payload.context.type !== undefined) {
      test.type = event.payload.context.type;
      await this.upsertTestResult(event.testJobId, test);
    }
    for (const round of event.payload.rounds) {
      await this.upsertTestRound(event.testJobId, round);
    }
  }

  public async handleTestRunUpdateEvent(event: TestRunUpdateEvent): Promise<void> {
    if (event.payload.job.type === 'run') {
      await this.upsertTestRun(event.payload.job);
    }
  }

  public async getTestRuns(): Promise<Array<TestRunHistory>> {
    const results = await this.db.query.runs
      .findMany({
        orderBy: { startedOn: 'desc' },
        with: { results: true }
      });
    
    return results.map(run => ({
      runId: run.runId,
      status: run.status,
      startedOn: run.startedOn,
      finishedOn: run.finishedOn ?? undefined,
      tests: run.results.map(result => ({
        id: [
          result.workspaceId,
          result.packageName,
          result.suiteName,
          result.testId
        ] as TestId,
        type: result.type ?? 'unit-test',
        status: result.status,
        group: result.group,
        time: result.time ?? undefined,
      }))
    }));
  }

  public async getTestRounds(runId: string, id: TestId): Promise<Array<TestRound>> {
    const [workspaceId, packageName, suiteName, testId] = id;
    const roundsDocuments = await this.db.select()
      .from(rounds)
      .where(and(
        eq(rounds.runId, runId),
        eq(rounds.workspaceId, workspaceId),
        eq(rounds.packageName, packageName),
        eq(rounds.suiteName, suiteName),
        eq(rounds.testId, testId)
      ));
    
    return roundsDocuments.map(round => ({
      id: round.roundId,
      testId: id,
      type: round.type,
      status: round.status,
      transitions: round.data.transitions,
      traces: round.data.traces,
    }));
  }
}