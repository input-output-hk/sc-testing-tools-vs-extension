import { createCoverage, updateCoverage } from './coverage';
import { validateTestEvent, getValidationError } from './validateTestEvent';

import type { ScriptOutput } from './runScript';
import type { SCToolsStreamingEvent as ScEvent, TxSummary as ScTx } from '../schemas/streaming-events';

type TestSuiteStartedEvent = Extract<ScEvent, { event: 'suite_started' }>;
type TestSuiteDoneEvent = Extract<ScEvent, { event: 'suite_done' }>;
type TestStartedEvent = Extract<ScEvent, { event: 'test_started' }>;
type TestTraceEvent = Extract<ScEvent, { event: 'test_trace' }>;
type TestProgressEvent = Extract<ScEvent, { event: 'test_progress' }>;
type TestDoneEvent = Extract<ScEvent, { event: 'test_done' }>;

export type TestEventValidationErrorData = {
  kind: 'invalid-test-event';
  rawEvent: unknown;
  validationError: string;
};

export class TestEventValidationError extends Error {
  public readonly data: TestEventValidationErrorData;

  constructor(data: TestEventValidationErrorData, message: string) {
    super(message);
    this.name = 'TestEventValidationError';
    this.data = data;
  }
};

const throwValidationError = (rawEvent: unknown): never => {
  const validationError = getValidationError();
  throw new TestEventValidationError(
    {
      kind: 'invalid-test-event',
      rawEvent,
      validationError
    },
    `Invalid test event: ${validationError}`
  );
};

const parseTestSuiteStartedEvent = (
  workspaceId: string,
  packageName: string,
  suiteName: string,
  isBuild: boolean,
  isFullRun: boolean,
  event: TestSuiteStartedEvent
): TestSuiteUpdateEvent => {
  let tests: Array<Test> | undefined = undefined;
  let coverageIndex: Array<TestEventCoverage> | undefined = undefined;

  if (isFullRun) {
    tests = [];
    for (const testItem of event.tests) {
      tests.push({
        id: [workspaceId, packageName, suiteName, testItem.id.toString()],
        name: testItem.name,
        group: testItem.path,
        status: isBuild ? 'undetermined' : 'waiting',
        location: testItem.srcLoc ? {
          uri: testItem.srcLoc.file,
          range: {
            start: {
              line: testItem.srcLoc.startLine - 1,
              character: testItem.srcLoc.startCol - 1,
            },
            end: {
              line: testItem.srcLoc.endLine - 1,
              character: testItem.srcLoc.endCol - 1,
            },
          },
        } : undefined,
      });
    }

    coverageIndex = Object.values(
      createCoverage(
        event.coverageIndex,
        workspaceId,
        packageName,
        suiteName
      )
    );
  }

  return {
    eventType: 'test-suite-update',
    payload: {
      workspaceId,
      packageName,
      suiteName,
      runStatus: isBuild ? 'idle' : 'running',
      tests,
      coverageIndex,
    },
  };
}

const parseTestSuiteDoneEvent = (
  workspaceId: string,
  packageName: string,
  suiteName: string,
  event: TestSuiteDoneEvent
): TestSuiteUpdateEvent => {
  return {
    eventType: 'test-suite-update',
    payload: {
      workspaceId,
      packageName,
      suiteName,
      runStatus: 'done',
    },
  };
};

const parseTestStartedEvent = (
  workspaceId: string,
  packageName: string,
  suiteName: string,
  event: TestStartedEvent
): TestUpdateEvent => {
  return {
    eventType: 'test-update',
    payload: {
      id: [workspaceId, packageName, suiteName, event.id.toString()],
      status: 'running',
      percentage: 0,
      time: 0,
    },
  };
};

const parseTestProgressEvent = (
  workspaceId: string,
  packageName: string,
  suiteName: string,
  event: TestProgressEvent
): TestUpdateEvent => {
  return {
    eventType: 'test-update',
    payload: {
      id: [workspaceId, packageName, suiteName, event.id.toString()],
      status: 'running',
      percentage: event.percent * 100,
      time: 0,
    },
  };
};

const parseTestDoneEvent = (
  workspaceId: string,
  packageName: string,
  suiteName: string,
  event: TestDoneEvent
): TestUpdateEvent => {
  return {
    eventType: 'test-update',
    payload: {
      id: [workspaceId, packageName, suiteName, event.id.toString()],
      type: event.threat_model ? 'threat-model' : undefined,
      status: event.success ? 'valid' : 'invalid',
      time: event.duration * 1000,
    },
  };
};

const mapScTx = (tx: ScTx | null): Tx | undefined => {
  if (!tx) return undefined;
  return {
    id: tx.id || undefined,
    fee: tx.fee,
    inputs: tx.inputs.map(input => ({
      address: input.address,
      utxo: input.utxo,
      value: input.value,
      redeemerConstr: input.redeemerConstr || undefined,
      redeemerKind: input.redeemerKind || undefined,
      redeemerPayload: input.redeemerPayload || undefined,
      redeemerRaw: input.redeemerRaw || undefined,
    })),
    outputs: tx.outputs.map(output => ({
      address: output.address,
      utxo: output.utxo,
      value: output.value,
      datum: output.datum || undefined,
    })),
    mint: tx.mint || undefined,
    signers: tx.signers.filter(signer => signer !== null),
  };
};

const parseTestTraceEvent = (
  workspaceId: string,
  packageName: string,
  suiteName: string,
  event: TestTraceEvent
): TestContextEvent => {
  const testId: TestId = [workspaceId, packageName, suiteName, event.id.toString()];
  const type: TestType | undefined = event.category === 'positive' || event.category === 'negative' ? event.category : undefined;
  
  const testRound: TransitionTestRound = {
    type,
    testId,
    id: event.trace.index,
    status: event.trace.status,
    transitions: [],
    threatModelTestIds:
      Array.from(new Set<string>(event.trace.threatModels.map(tm => tm.testId.toString())))
        .map(tmId => [workspaceId, packageName, suiteName, tmId]),
  };

  const coverage = createCoverage(
    event.covered,
    workspaceId,
    packageName,
    suiteName,
    event.id.toString()
  );

  for (const transition of event.trace.transitions) {
    testRound.transitions.push({
      action: transition.action,
      result: transition.result,
      stepIndex: transition.stepIndex,
      tx: mapScTx(transition.transaction),
    });
  }

  const tmRounds: Record<string, ThreatModelTestRound> = {};
  const traces: Record<string, Array<ThreatModelTrace>> = {};

  for (const tm of event.trace.threatModels) {
    const tmId = tm.testId.toString();

    updateCoverage(
      coverage,
      tm.covered,
      workspaceId,
      packageName,
      suiteName,
      tmId
    );

    tmRounds[tmId] = {
      type: 'threat-model',
      id: event.trace.index,
      status: event.trace.status,
      testId: [workspaceId, packageName, suiteName, tmId],
      parentTestId: testId,
      traces: [],
    };

    if (!traces[tmId]) traces[tmId] = [];

    traces[tmId].push({
      tx: mapScTx(tm.originalTx)!,
      modifiedTx: mapScTx(tm.modifiedTx),
      modifications: tm.modifications,
      outcome: tm.outcome,
      targetTxIndex: tm.targetTxIndex,
    });
  }

  for (const tmRound of Object.values(tmRounds)) {
    tmRound.traces = traces[tmRound.testId[3]];
  }

  return {
    eventType: 'test-context',
    payload: {
      context: { testId, type },
      rounds: [testRound, ...Object.values(tmRounds)],
      coverage: Object.values(coverage),
    },
  };
};

export const parseTestSuiteBuildEvent = (
  workspaceId: string,
  packageName: string,
  suiteName: string,
  scriptOutput: ScriptOutput
): TestSuiteUpdateEvent | null => {
  const rawEvent = scriptOutput.parsed;
  if (validateTestEvent(rawEvent)) {
    if (rawEvent.event === 'suite_started') {
      return parseTestSuiteStartedEvent(workspaceId, packageName, suiteName, true, true, rawEvent);
    }
  } else {
    throwValidationError(rawEvent);
  }
  return null;
};

export const parseTestEvent = (
  workspaceId: string,
  packageName: string,
  suiteName: string,
  hasTestIds: boolean,
  scriptOutput: ScriptOutput
): TestEvent | null => {
  const rawEvent = scriptOutput.parsed;
  if (validateTestEvent(rawEvent)) {
    switch (rawEvent.event) {
      case 'suite_started':
        return parseTestSuiteStartedEvent(workspaceId, packageName, suiteName, false, !hasTestIds, rawEvent);
      case 'suite_done':
        return parseTestSuiteDoneEvent(workspaceId, packageName, suiteName, rawEvent);
      case 'test_started':
        return parseTestStartedEvent(workspaceId, packageName, suiteName, rawEvent);
      case 'test_progress':
        return parseTestProgressEvent(workspaceId, packageName, suiteName, rawEvent);
      case 'test_done':
        return parseTestDoneEvent(workspaceId, packageName, suiteName, rawEvent);
      case 'test_trace':
        return parseTestTraceEvent(workspaceId, packageName, suiteName, rawEvent);
    }
  } else {
    throwValidationError(rawEvent);
  }
  return null;
};