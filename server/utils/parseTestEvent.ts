import { createCoverage, updateCoverage } from './coverage';
import { validateTestEvent, getValidationError } from './validateTestEvent';

import type { ScriptOutput } from './runScript';
import type { SCToolsStreamingEvent as StreamingEvent } from '../schemas/streaming-events';

type TestSuiteStartedEvent = Extract<StreamingEvent, { event: 'suite_started' }>;
type TestSuiteDoneEvent = Extract<StreamingEvent, { event: 'suite_done' }>;
type TestStartedEvent = Extract<StreamingEvent, { event: 'test_started' }>;
type TestTraceEvent = Extract<StreamingEvent, { event: 'test_trace' }>;
type TestProgressEvent = Extract<StreamingEvent, { event: 'test_progress' }>;
type TestDoneEvent = Extract<StreamingEvent, { event: 'test_done' }>;

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
  isFullRun: boolean,
  event: TestSuiteStartedEvent
): TestSuiteUpdateEvent => {
  let tests: Array<Test> | undefined = undefined;
  let coverage: Array<FileCoverage> | undefined = undefined;

  if (isFullRun) {
    tests = [];
    for (const testItem of event.tests) {
      tests.push({
        id: [workspaceId, packageName, suiteName, testItem.id.toString()],
        name: testItem.name,
        group: testItem.path,
        status: 'undetermined',
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

    coverage = Object.values(createCoverage(event.coverageIndex));
  }

  return {
    eventType: 'test-suite-update',
    payload: {
      workspaceId,
      packageName,
      suiteName,
      runStatus: 'running',
      tests,
      coverage,
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
      status: event.success ? 'valid' : 'invalid',
      time: event.duration * 1000,
    },
  };
};

const parseTestTraceEvent = (
  workspaceId: string,
  packageName: string,
  suiteName: string,
  event: TestTraceEvent
): TestContextEvent => {
  const testId: TestId = [workspaceId, packageName, suiteName, event.id.toString()];
  const coverage = createCoverage(event.covered, testId);

  for (const tm of event.trace.threatModels) {
    const tmTestId: TestId = [workspaceId, packageName, suiteName, tm.testId.toString()];
    updateCoverage(coverage, tm.covered, tmTestId);
  }

  return {
    eventType: 'test-context',
    payload: {
      id: testId,
      coverage: Object.values(coverage),
    },
  };
};

export const parseBuildTestTreeEvent = (
  workspaceId: string,
  packageName: string,
  suiteName: string,
  scriptOutput: ScriptOutput
): TestSuiteUpdateEvent | null => {
  const rawEvent = scriptOutput.parsed;
  if (validateTestEvent(rawEvent)) {
    if (rawEvent.event === 'suite_started') {
      const event = parseTestSuiteStartedEvent(workspaceId, packageName, suiteName, true, rawEvent);
      event.payload.runStatus = 'idle';
      return event;
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
        return parseTestSuiteStartedEvent(workspaceId, packageName, suiteName, !hasTestIds, rawEvent);
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