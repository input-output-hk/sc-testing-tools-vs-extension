// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import TestStore from './services/testStore';
import TestTreeView from './modules/testTreeView';
import TestResultView from './modules/testResultView';

export type PbtContext = {
  extension: vscode.ExtensionContext;
  testStore: TestStore;
  testTreeView: TestTreeView;
  testResultView: TestResultView;
  outputChannel: vscode.OutputChannel;
};

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Init test store
  const testStore = new TestStore(context);

  // Init test tree view
  const testTreeView = new TestTreeView();

  // Init test result view
  const testResultView = new TestResultView();

  // Init output channel
  const outputChannel = vscode.window.createOutputChannel('PBT Extension');

  // Init context
  const pbtContext: PbtContext = {
    extension: context,
    testStore,
    testTreeView,
    testResultView,
    outputChannel,
  };

  // Init workspaces
  testStore.initialize(pbtContext).then(() => {
    // Activate modules
    testTreeView.activate(pbtContext);
    testResultView.activate(pbtContext);
  });

  // Add subscriptions to context
  context.subscriptions.push(outputChannel);
}

// This method is called when your extension is deactivated
export function deactivate() {}
