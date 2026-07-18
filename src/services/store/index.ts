import * as vscode from 'vscode';

import TestStore from './testStore';
import SettingStore from './settingStore';
import DependencyStore from './dependencyStore';

import type { PbtContext } from '../../extension';

export default class Store {
  public readonly settingStore: SettingStore;
  public readonly testStore: TestStore;
  public readonly dependencyStore: DependencyStore;

  constructor(context: vscode.ExtensionContext) {
    this.settingStore = new SettingStore();
    this.testStore = new TestStore(context);
    this.dependencyStore = new DependencyStore();
  }

  public async initialize(context: PbtContext): Promise<void> {
    this.settingStore.initialize(context);
    await this.testStore.initialize(context);
    await this.dependencyStore.initialize();
  }
}
