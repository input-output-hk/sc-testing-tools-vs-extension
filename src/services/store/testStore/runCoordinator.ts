import { SuiteRunIntent } from './runIntentStore';
import { SuiteStateActions } from './suiteState';
import { getSuiteRunIds } from './treeState';

export interface PreparedRunRequest {
  workspacePath: string;
  packageName: string;
  suiteName: string;
  testIds: Array<number>;
}

export interface RunCoordinatorContext {
  getPackages: () => TestPackageList | null;
  getTests: () => TestList;
  setSuiteRunIntent: (packageName: string, suiteName: string, runIntent: SuiteRunIntent) => void;
  notifyTestUpdate: (test: Test) => void;
  suiteState: SuiteStateActions;
}

export default class RunCoordinator {
  constructor(private readonly context: RunCoordinatorContext) {}

  public prepareRunTests(
    workspacePath: string,
    packageName: string,
    suiteName: string,
    testIds: Array<number>,
    runIntent: SuiteRunIntent = 'partial',
  ): PreparedRunRequest {
    this.context.setSuiteRunIntent(packageName, suiteName, runIntent);
    this.context.suiteState.updateSuiteStatus(packageName, suiteName, 'running');

    const tests = this.context.getTests();
    for (const id of testIds) {
      const testId = `${packageName}:${suiteName}:${id}`;
      const test = tests[testId];
      if (!test) continue;

      test.status = 'running';
      test.time = 0;
      this.context.notifyTestUpdate(test);
    }

    return {
      workspacePath,
      packageName,
      suiteName,
      testIds,
    };
  }

  public prepareSuiteRun(packageName: string, suiteName: string): PreparedRunRequest {
    const testPackage = this.context.getPackages()?.[packageName];
    if (!testPackage) {
      throw new Error(`Unknown package: ${packageName}`);
    }

    const testSuite = testPackage.suites[suiteName];
    if (!testSuite) {
      throw new Error(`Unknown suite: ${packageName}/${suiteName}`);
    }

    const tests = this.context.getTests();
    const testIds = getSuiteRunIds(testSuite.tree)
      .map((testId) => tests[testId]?.runId)
      .filter((id): id is number => Number.isInteger(id));

    return this.prepareRunTests(testPackage.workspacePath, packageName, suiteName, testIds, 'full-suite');
  }
}