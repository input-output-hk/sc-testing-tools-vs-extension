import * as vscode from 'vscode';

import TestStore from './testStore';
import SettingStore from './settingStore';

import type { PbtContext } from '../../extension';

export default class Store {
  public readonly settingStore: SettingStore;
  public readonly testStore: TestStore;

  constructor(context: vscode.ExtensionContext) {
    this.settingStore = new SettingStore();
    this.testStore = new TestStore(context, this.settingStore);
  }

  public async initialize(context: PbtContext): Promise<void> {
    this.settingStore.initialize(context);
    await this.testStore.initialize(context);
  }
}
