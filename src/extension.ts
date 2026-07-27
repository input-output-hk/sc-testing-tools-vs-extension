// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import Store from './services/store';
import TestTreeView from './modules/testTreeView';
import TestConfigurationView from './modules/testConfigurationView';
import { renderCoverageForEditor } from './utils/coverage';

export type PbtContext = {
  extension: vscode.ExtensionContext;
  store: Store;
  testTreeView: TestTreeView;
  testConfigurationView: TestConfigurationView;
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
  const testConfigurationView = new TestConfigurationView();
  // Init output channel
  const outputChannel = vscode.window.createOutputChannel('PBT Extension');

  //Init status bar item
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);

  // Init context
  const pbtContext: PbtContext = {
    extension: context,
    store,
    testTreeView,
    testConfigurationView,
    outputChannel,
    statusBarItem,
  };

  // Init workspaces
  store.initialize(pbtContext).then(() => {
    // Activate modules
    testTreeView.activate(pbtContext);
    testConfigurationView.activate(pbtContext);
  });

  // Render coverage for active document
  vscode.window.onDidChangeActiveTextEditor(editor => {
    if (editor) {
      renderCoverageForEditor(editor, store.testStore.getCoverage(editor.document.uri))
    }
  }, null, context.subscriptions);

  // Remove coverage when user edits document
  vscode.workspace.onDidChangeTextDocument(event => {
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor && event.document === activeEditor.document) {
      renderCoverageForEditor(activeEditor, []);
    }
  }, null, context.subscriptions);

  // Add subscriptions to context
  context.subscriptions.push(outputChannel, statusBarItem);
}

// This method is called when your extension is deactivated
export function deactivate() {}
