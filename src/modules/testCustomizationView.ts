import * as vscode from 'vscode';
import { GenericWebviewViewProvider, getWebviewHtml } from '../utils/webview';

import type { PbtContext } from '../extension';

export default class TestCustomizationView {
  private context: PbtContext;
  private webview: vscode.Webview | null = null;

  constructor() {
    this.context = {} as PbtContext;
  }

  public activate(context: PbtContext) {
    this.context = context;
    const testCustomizationProvider = new GenericWebviewViewProvider(context.extension.extensionUri, 'testCustomization', this.onWebviewResolved.bind(this));
    const testCustomizationPanel = vscode.window.registerWebviewViewProvider('pbt-test-customization', testCustomizationProvider);
    context.extension.subscriptions.push(testCustomizationPanel);
  }

  private onWebviewResolved(webview: vscode.Webview): void {
      this.webview = webview;
  
    }

}