export default class TestState {
  private tests: TestList = {};
  private packages: TestPackageList | null = null;

  public getTests(): TestList {
    return this.tests;
  }

  public getPackages(): TestPackageList | null {
    return this.packages;
  }

  public replaceAll(packageData: TestPackageData): TestPackageData {
    this.packages = packageData.packages;
    this.tests = packageData.tests;
    return packageData;
  }

  public getPackagePath(packageName: string): string {
    return this.packages?.[packageName]?.packagePath || '';
  }

  public getTestPackages(): TestPackageData | null {
    if (this.packages === null) {
      return null;
    }

    return {
      packages: this.packages,
      tests: this.tests,
    };
  }

  public updatePackages(packages: TestPackageList): void {
    this.packages = packages;
  }
}