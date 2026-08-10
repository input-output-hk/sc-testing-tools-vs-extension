// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import Store from './services/store';
import TestTreeView from './modules/testTreeView';
import TestResultView from './modules/testResultView';
import TestConfigurationView from './modules/testConfigurationView';
import TestSummaryView from './modules/testSummaryView';

export type PbtContext = {
  extension: vscode.ExtensionContext;
  store: Store;
  testTreeView: TestTreeView;
  testResultView: TestResultView;
  testConfigurationView: TestConfigurationView;
  testSummaryView: TestSummaryView;
  outputChannel: vscode.OutputChannel;
  statusBarItem: vscode.StatusBarItem;
};

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

  // Init store
  const store = new Store(context);

  // Init test tree view
  const testTreeView = new TestTreeView();

  // Init test result view
  const testResultView = new TestResultView();

  // Init test configuration view
  const testConfigurationView = new TestConfigurationView();

  // Init test summary view
  const testSummaryView = new TestSummaryView();

  // Init output channel
  const outputChannel = vscode.window.createOutputChannel('PBT Extension');

  // Init status bar item
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);

  // Init context
  const pbtContext: PbtContext = {
    extension: context,
    store,
    testTreeView,
    testResultView,
    testConfigurationView,
    testSummaryView,
    outputChannel,
    statusBarItem,
  };

  // Init workspaces
  store.initialize(pbtContext).then(() => {
    // Activate modules
    testTreeView.activate(pbtContext);
    testResultView.activate(pbtContext);
    testConfigurationView.activate(pbtContext);
    testSummaryView.activate(pbtContext);
  });

  // Add subscriptions to context
  context.subscriptions.push(outputChannel, statusBarItem);
}

// This method is called when your extension is deactivated
export function deactivate() {}
