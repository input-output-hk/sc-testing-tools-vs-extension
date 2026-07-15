// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import Store from './services/store';
import TestTreeView from './modules/testTreeView';
import TestCustomizationView from './modules/testCustomizationView';

export type PbtContext = {
  extension: vscode.ExtensionContext;
  store: Store;
  testTreeView: TestTreeView;
  outputChannel: vscode.OutputChannel;
};

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Init store
  const store = new Store(context);

  // Init test tree view
  const testTreeView = new TestTreeView();
  const testCustomizationView = new TestCustomizationView();

  // Init output channel
  const outputChannel = vscode.window.createOutputChannel('PBT Extension');

  // Init context
  const pbtContext: PbtContext = {
    extension: context,
    store,
    testTreeView,
    outputChannel,
  };

  // Init workspaces
  store.initialize(pbtContext).then(() => {
    // Activate modules
    testTreeView.activate(pbtContext);
    testCustomizationView.activate(pbtContext);
  });

  // Add subscriptions to context
  context.subscriptions.push(outputChannel);
}

// This method is called when your extension is deactivated
export function deactivate() {}
