export default class TestStoreNotifier {
  private testPackagesUpdateCallbacks: ((data: TestPackageData) => void)[] = [];
  private testUpdateCallbacks: ((test: Test) => void)[] = [];
  private runTestsErrorCallbacks: ((error: RunTestsErrorData) => void)[] = [];

  public onTestPackagesUpdate(callback: (data: TestPackageData) => void): void {
    this.testPackagesUpdateCallbacks.push(callback);
  }

  public onTestUpdate(callback: (test: Test) => void): void {
    this.testUpdateCallbacks.push(callback);
  }

  public onRunTestsError(callback: (error: RunTestsErrorData) => void): void {
    this.runTestsErrorCallbacks.push(callback);
  }

  public notifyTestUpdate(test: Test): void {
    for (const callback of this.testUpdateCallbacks) {
      callback(test);
    }
  }

  public notifyTestPackagesUpdate(packageData: TestPackageData | null): void {
    if (packageData === null) {
      return;
    }

    for (const callback of this.testPackagesUpdateCallbacks) {
      callback(packageData);
    }
  }

  public notifyRunTestsError(error: RunTestsErrorData): void {
    for (const callback of this.runTestsErrorCallbacks) {
      callback(error);
    }
  }
}
