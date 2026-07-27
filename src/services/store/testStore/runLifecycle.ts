import { TestInfo } from '../../../../shared/streaming-events';

import CoverageStore from './coverageStore';
import { SuiteRunIntent } from './runIntentStore';
import { SuiteStateActions } from './suiteState';

export interface RunLifecycleContext {
  getTests: () => TestList;
  getPackagePath: (packageName: string) => string;
  getSuiteRunIntent: (packageName: string, suiteName: string) => SuiteRunIntent;
  hydrateSuiteTestsFromRun: (packageName: string, suiteName: string, testInfos: Array<TestInfo>) => void;
  suiteState: SuiteStateActions;
  clearSuiteRunIntent: (packageName: string, suiteName: string) => void;
  notifyTestUpdate: (test: Test) => void;
  notifyRunTestsError: (error: RunTestsErrorData) => void;
  coverageStore: CoverageStore;
  logLine: (message: string) => void;
}

export function handleTestResult(result: TestResult, context: RunLifecycleContext): void {
  if (result.error !== undefined) {
    context.logLine(`ERROR: ${result.error}\n${JSON.stringify(result.rawEvent)}`);
    return;
  }

  const [packageName, suiteName] = result.id.split(':');
  const packagePath = context.getPackagePath(packageName);
  const tests = context.getTests();
  const evt = result.event;

  switch (evt.event) {
    case 'suite_started': {
      const runIntent = context.getSuiteRunIntent(packageName, suiteName);
      context.logLine(`${suiteName} started (${runIntent}).`);
      if (runIntent === 'full-suite') {
        context.hydrateSuiteTestsFromRun(packageName, suiteName, evt.tests);
      } else {
        context.logLine(`Skipping suite tree hydration for partial run ${packageName}/${suiteName}.`);
      }
      context.coverageStore.setBaseCoverageIndex(packagePath, evt.coverageIndex);
      break;
    }

    case 'test_started': {
      const test = tests[result.id];
      if (!test) {
        break;
      }

      test.status = 'running';
      test.time = 0;
      test.percentage = 0;
      context.notifyTestUpdate(test);
      break;
    }

    case 'test_trace': {
      context.coverageStore.addCovered(packagePath, evt.covered, result.id);
      for (const tm of evt.trace.threatModels) {
        const tmId = `${packageName}:${suiteName}:${tm.testId}`;
        context.coverageStore.setComparison(tmId, result.id);
        context.coverageStore.addCovered(packagePath, tm.covered, tmId);
      }
      break;
    }

    case 'test_progress': {
      const test = tests[result.id];
      if (!test) {
        break;
      }

      test.percentage = evt.percent * 100;
      context.notifyTestUpdate(test);
      break;
    }

    case 'test_done': {
      const test = tests[result.id];
      if (!test) {
        break;
      }

      if (!evt.success) {
        context.logLine(`${test.name}: FAILED`);
        context.logLine(`  ${evt.description.replace(/\n/g, '\n  ')}`);
      }

      test.status = evt.success ? 'valid' : 'invalid';
      test.time = evt.duration * 1000;
      context.notifyTestUpdate(test);
      break;
    }

    case 'suite_done': {
      context.suiteState.updateSuiteStatus(packageName, suiteName, evt.failed === 0 ? 'valid' : 'invalid');
      context.clearSuiteRunIntent(packageName, suiteName);
      context.logLine(`Finished ${suiteName} in ${evt.duration.toFixed(1)}s, ${evt.passed}/${evt.passed + evt.failed} tests passed.`);
      break;
    }
  }
}

export function handleRunTestsError(error: RunTestsErrorData, context: RunLifecycleContext): void {
  const { packageName, suiteName, testIds } = error.runContext;
  const tests = context.getTests();

  if (testIds.length > 0) {
    for (const id of testIds) {
      const testId = `${packageName}:${suiteName}:${id}`;
      const test = tests[testId];
      if (!test) {
        continue;
      }

      test.status = 'invalid';
      context.notifyTestUpdate(test);
    }
  } else {
    context.suiteState.markSuiteRunningTestsAsFailed(packageName, suiteName);
  }

  context.suiteState.updateSuiteStatus(packageName, suiteName, 'invalid');
  context.clearSuiteRunIntent(packageName, suiteName);
  context.notifyRunTestsError(error);
}
