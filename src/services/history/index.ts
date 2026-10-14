import os from 'os';
import fs from 'fs';
import path from 'path';
import { eq, and, notInArray } from 'drizzle-orm';
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

  public async clear(): Promise<void> {
    this.db.transaction(transaction => {
      transaction.delete(rounds).run();
      transaction.delete(results).run();
      transaction.delete(runs).run();
    });
  }

  /**
   * Creates the `runs` row for a new history run when play is pressed, before the server responds.
   */
  public async insertTestRun(runId: string, startedOn: number): Promise<void> {
    await this.db.insert(runs)
      .values({
        runId,
        status: 'running',
        startedOn,
      });
  }

  /**
   * Stores the final status and end time of a history run (last job done, or stopped).
   */
  public async finishTestRun(runId: string, status: TestJobStatus, finishedOn: number): Promise<void> {
    await this.db.update(runs)
      .set({ status, finishedOn })
      .where(eq(runs.runId, runId));
  }

  /**
   * Writes the played tests into the run as pending (`undetermined`), so the Summary shows them immediately.
   */
  public async mirrorTestResults(runId: string, tests: Array<HistoryRunTest>): Promise<void> {
    for (const test of tests) {
      await this.resetTestResult(runId, test);
    }
  }

  /**
   * Resets one test in a run to pending: deletes its rounds and upserts its row as `undetermined` with no time.
   * Only the final result per run is kept. An undefined `type` keeps the stored one (drizzle skips undefined).
   */
  private async resetTestResult(runId: string, test: HistoryRunTest): Promise<void> {
    const [workspaceId, packageName, suiteName, testId] = test.id;
    await this.db.delete(rounds)
      .where(and(
        eq(rounds.runId, runId),
        eq(rounds.workspaceId, workspaceId),
        eq(rounds.packageName, packageName),
        eq(rounds.suiteName, suiteName),
        eq(rounds.testId, testId)
      ));

    await this.db.insert(results)
      .values({
        runId,
        workspaceId,
        packageName,
        suiteName,
        testId,
        type: test.type,
        status: 'undetermined',
        group: test.group,
        time: null,
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
          status: 'undetermined',
          group: test.group,
          time: null,
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
    if (event.payload.runStatus === 'idle' || event.payload.tests === undefined) return;

    const { workspaceId, packageName, suiteName } = event.payload;
    const runId = event.testJobId;
    const tests: Array<Test> = [];
    const testIds: Array<string> = [];
    for (const test of event.payload.tests) {
      if (!test.isStatic) {
        tests.push(test);
        testIds.push(test.id[3]);
      }
    }

    await this.db.delete(rounds)
      .where(and(
        eq(rounds.runId, runId),
        eq(rounds.workspaceId, workspaceId),
        eq(rounds.packageName, packageName),
        eq(rounds.suiteName, suiteName),
        notInArray(rounds.testId, testIds)
      ));

    await this.db.delete(results)
      .where(and(
        eq(results.runId, runId),
        eq(results.workspaceId, workspaceId),
        eq(results.packageName, packageName),
        eq(results.suiteName, suiteName),
        notInArray(results.testId, testIds)
      ));

    for (const test of tests) {
      await this.resetTestResult(runId, test);
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