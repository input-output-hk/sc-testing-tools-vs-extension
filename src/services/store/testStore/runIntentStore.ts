export type SuiteRunIntent = 'full-suite' | 'partial';

export default class SuiteRunIntentStore {
  private suiteRunIntents: Record<string, SuiteRunIntent> = {};

  private getSuiteKey(packageName: string, suiteName: string): string {
    return `${packageName}:${suiteName}`;
  }

  public getIntent(packageName: string, suiteName: string): SuiteRunIntent {
    const suiteKey = this.getSuiteKey(packageName, suiteName);
    return this.suiteRunIntents[suiteKey] ?? 'partial';
  }

  public setIntent(packageName: string, suiteName: string, runIntent: SuiteRunIntent): void {
    const suiteKey = this.getSuiteKey(packageName, suiteName);
    this.suiteRunIntents[suiteKey] = runIntent;
  }

  public clearIntent(packageName: string, suiteName: string): void {
    const suiteKey = this.getSuiteKey(packageName, suiteName);
    delete this.suiteRunIntents[suiteKey];
  }
}
