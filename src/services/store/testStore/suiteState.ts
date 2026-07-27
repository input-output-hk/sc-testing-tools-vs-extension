import { getSuiteRunIds } from './treeState';

export interface SuiteStateActions {
  updateSuiteStatus: (packageName: string, suiteName: string, status: TestStatus) => void;
  markSuiteRunningTestsAsFailed: (packageName: string, suiteName: string) => void;
}

export interface SuiteStateContext {
  getPackages: () => TestPackageList | null;
  getTests: () => TestList;
  notifyTestPackagesUpdate: () => void;
  notifyTestUpdate: (test: Test) => void;
}

export default class SuiteStateStore implements SuiteStateActions {
  constructor(private readonly context: SuiteStateContext) {}

  public updateSuiteStatus(packageName: string, suiteName: string, status: TestStatus): void {
    const testSuite = this.context.getPackages()?.[packageName]?.suites[suiteName];
    if (!testSuite) {
      return;
    }

    testSuite.status = status;
    this.context.notifyTestPackagesUpdate();
  }

  public markSuiteRunningTestsAsFailed(packageName: string, suiteName: string): void {
    const suiteTree = this.context.getPackages()?.[packageName]?.suites[suiteName]?.tree;
    if (!suiteTree) return;

    const tests = this.context.getTests();
    for (const testId of getSuiteRunIds(suiteTree)) {
      const test = tests[testId];
      if (!test || test.status !== 'running') continue;
      test.status = 'invalid';
      this.context.notifyTestUpdate(test);
    }
  }
}