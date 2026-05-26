import * as vscode from 'vscode';
import { handleJsonRpcRequest } from './rpc/server';
import { JsonRpcRequest, JsonRpcResponse } from './rpc/types';

export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel('PBT Extension');
  context.subscriptions.push(outputChannel);

  const testController = vscode.tests.createTestController('pbt-extension.tests', 'PBT Tests');
  context.subscriptions.push(testController);

  const buildTestTree = async (): Promise<void> => {
    await buildTestTreeInController(context, outputChannel, testController);
  };

  testController.refreshHandler = buildTestTree;

	outputChannel.appendLine('Extension activated. Scheduling background build-test-tree request.');

	const disposable = vscode.commands.registerCommand('pbt-extension.helloWorld', () => {
		vscode.window.showInformationMessage('PBT Extension is running build-test-tree in background.');
	});

	const refreshDisposable = vscode.commands.registerCommand('pbt-extension.buildTestTree', buildTestTree);

	context.subscriptions.push(disposable);
  context.subscriptions.push(refreshDisposable);

  void buildTestTree();
}

export function deactivate() {}

async function buildTestTreeInController(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
  testController: vscode.TestController,
): Promise<void> {
  const request: JsonRpcRequest = {
    jsonrpc: '2.0',
    id: `build-test-tree-${Date.now()}`,
    method: 'build-test-tree',
  };

  outputChannel.appendLine(`JSON-RPC request: ${JSON.stringify(request)}`);

  const response = await handleJsonRpcRequest(request, {
    extensionPath: context.extensionPath,
  });

  logJsonRpcResponse(response, outputChannel);

  if ('error' in response) {
    return;
  }

  const tests = extractTestsFromResult(response.result);
  if (tests === null) {
    outputChannel.appendLine('Could not load tests into Testing view due to unexpected result shape.');
    return;
  }

  const rootItem = testController.createTestItem('root::pbt', 'PBT');
  const groupItems = new Map<string, vscode.TestItem>();

  for (const test of tests) {
    let parent = rootItem;
    const pathSegments = test.path.filter((segment) => segment.trim().length > 0);
    let accumulatedPath = '';

    for (const segment of pathSegments) {
      accumulatedPath = accumulatedPath.length === 0 ? segment : `${accumulatedPath}/${segment}`;

      let group = groupItems.get(accumulatedPath);
      if (group === undefined) {
        group = testController.createTestItem(`group::${accumulatedPath}`, segment);
        parent.children.add(group);
        groupItems.set(accumulatedPath, group);
      }

      parent = group;
    }

    const leafId = `test::${test.id}::${pathSegments.join('/')}::${test.name}`;
    const leaf = testController.createTestItem(leafId, test.name);
    parent.children.add(leaf);
  }

  testController.items.replace([rootItem]);
  outputChannel.appendLine(`Loaded ${tests.length} tests into Testing view.`);
}

function logJsonRpcResponse(response: JsonRpcResponse, outputChannel: vscode.OutputChannel): void {
  if ('result' in response) {
    outputChannel.appendLine('build-test-tree completed successfully.');
    outputChannel.appendLine('JSON-RPC response result:');
    outputChannel.appendLine(JSON.stringify(response.result, null, 2));
    return;
  }

  outputChannel.appendLine('build-test-tree failed.');
  outputChannel.appendLine(`JSON-RPC error (${response.error.code}): ${response.error.message}`);

  if (response.error.data !== undefined) {
    outputChannel.appendLine('Error data:');
    outputChannel.appendLine(JSON.stringify(response.error.data, null, 2));
  }
}

interface ListedTest {
  id: number;
  name: string;
  path: string[];
}

function extractTestsFromResult(result: unknown): ListedTest[] | null {
  if (!isRecord(result)) {
    return null;
  }

  const parsed = result.parsed;
  if (!isRecord(parsed)) {
    return null;
  }

  const tests = parsed.tests;
  if (!Array.isArray(tests)) {
    return null;
  }

  const listedTests: ListedTest[] = [];
  for (const item of tests) {
    if (!isRecord(item)) {
      continue;
    }

    if (typeof item.id !== 'number' || typeof item.name !== 'string' || !Array.isArray(item.path)) {
      continue;
    }

    if (!item.path.every((segment) => typeof segment === 'string')) {
      continue;
    }

    listedTests.push({
      id: item.id,
      name: item.name,
      path: item.path,
    });
  }

  return listedTests;
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null;
}
