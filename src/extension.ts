import * as vscode from 'vscode';
import { handleJsonRpcRequest } from './rpc/server';
import { JsonRpcRequest, JsonRpcResponse } from './rpc/types';
import { runBuildTestTreeScript } from './services/buildTestTree';

let coverageIndex: {[key: string]: SrcLocRanges[]} = {};
let coverageRanges: { [file: string]: { [key: string]: vscode.StatementCoverage } } = {};
export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel('PBT Extension');
  context.subscriptions.push(outputChannel);

  const testController = vscode.tests.createTestController('pbt-extension.tests', 'PBT Tests');
  context.subscriptions.push(testController);

  const buildTestTree = async (): Promise<void> => {
    await buildTestTreeInController(context, outputChannel, testController);
  };

  testController.refreshHandler = buildTestTree;
  testController.items.replace([testController.createTestItem('root::pbt', 'Loading tests...')]);

  outputChannel.appendLine('Extension activated. Scheduling background build-test-tree request.');

  const disposable = vscode.commands.registerCommand('pbt-extension.helloWorld', () => {
    vscode.window.showInformationMessage('PBT Extension is running build-test-tree in background.');
  });

  const refreshDisposable = vscode.commands.registerCommand('pbt-extension.buildTestTree', buildTestTree);

  context.subscriptions.push(disposable);
  context.subscriptions.push(refreshDisposable);

  async function runHandler(
    shouldDebug: boolean,
    request: vscode.TestRunRequest,
    token: vscode.CancellationToken
  ) {
    const run = testController.createTestRun(request);

    let packageRoot = "";
    try {
      for await (const result of runBuildTestTreeScript(context.extensionPath, 'scripts/run-tests-json.sh')) {
        // outputChannel.appendLine(JSON.stringify(result.parsed, null, 2));
        outputChannel.appendLine((result.parsed as { event: string}).event);
        if ((result.parsed as { packageRoot: string}).packageRoot) {
          packageRoot = (result.parsed as { packageRoot: string}).packageRoot;
        }
        let covered = (result.parsed as { covered: SrcLocRanges[] }).covered;
        if (covered) {
          covered.map(f => {
            f.covered = true;
            let uri = vscode.Uri.file(packageRoot + '/' + f.file).toString();
            coverageIndex[uri] ||= [];
            coverageIndex[uri].push(f);
          });
        }
      }
    } catch(e) {
      outputChannel.appendLine("Error while running tests: ");
      outputChannel.appendLine(JSON.stringify(e));
    }

    for (let file in coverageIndex) {
      let covDatas = coverageIndex[file];
      coverageRanges[file] ||= {};

      for (const covData of covDatas) {
        covData.startLines.map(function(startLine, i) {
          let startCol = covData.startCols[i];
          let endLine = covData.endLines[i];
          let endCol = covData.endCols[i];
          let rng = new vscode.Range(
            new vscode.Position(startLine - 1, startCol - 1),
            new vscode.Position(endLine - 1, endCol - 1)
          );
          let key = `${startLine},${startCol}-${endLine},${endCol}`;
          let cov = new vscode.StatementCoverage(covData.covered, rng);
          if (!coverageRanges[file][key]?.executed)
            coverageRanges[file][key] = cov;
        })
      }
      let total = 0, covered = 0;
      for (const cov of Object.values(coverageRanges[file])) {
        total++;
        if (cov.executed) covered++;
      }

      run.addCoverage(new vscode.FileCoverage(
        vscode.Uri.parse(file),
        new vscode.TestCoverageCount(covered, total)
      ));
    }

    run.end();
  }

  const coverageProfile = testController.createRunProfile(
    'Coverage',
    vscode.TestRunProfileKind.Coverage,
    (request, token) => {
      runHandler(false, request, token);
    }
  );

  coverageProfile.loadDetailedCoverage = async (_testRun, coverage) => {
    outputChannel.appendLine(`Loading coverage for ${coverage.uri}`);
    let details = coverageRanges[coverage.uri.toString()];
    if (!details) {
      outputChannel.appendLine(`No coverage found for ${coverage.uri}, only for ${Object.keys(coverageRanges)}`);
      return [];
    }
    return Object.values(details);
  }

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
    const leaf = testController.createTestItem(leafId, test.name, test.uri);
    parent.children.add(leaf);
  }

  testController.items.replace([rootItem]);

  coverageIndex = extractCoverageIndex(response.result);

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
  uri: vscode.Uri;
}

function extractTestsFromResult(result: unknown): ListedTest[] | null {
  if (!isRecord(result)) {
    return null;
  }

  const parsed = result.parsed;
  if (!isRecord(parsed)) {
    return null;
  }

  const packageRoot: string = parsed.packageRoot;

  const tests = parsed.tests;
  if (!Array.isArray(tests)) {
    return null;
  }

  const listedTests: ListedTest[] = [];
  for (const item of tests) {
    if (!isRecord(item)) {
      continue;
    }

    if (typeof item.id !== 'number' || typeof item.name !== 'string' || !Array.isArray(item.path) || !isRecord(item.srcLoc)) {
      continue;
    }

    if (!item.path.every((segment) => typeof segment === 'string')) {
      continue;
    }

    listedTests.push({
      id: item.id,
      name: item.name,
      path: item.path,
      uri: vscode.Uri.file(packageRoot + '/' + item.srcLoc.file),
    });
  }

  return listedTests;
}

interface SrcLocRanges {
  file: string;
  startLines: number[];
  startCols: number[];
  endLines: number[];
  endCols: number[];
  covered: boolean;
}
function extractCoverageIndex(result: unknown): { [key: string]: SrcLocRanges[] } {
  let coverageIndex = (result as { parsed: { coverageIndex: SrcLocRanges[]} }).parsed.coverageIndex;
  let packageRoot = (result as { parsed: { packageRoot: string} }).parsed.packageRoot;
  let map: { [key: string]: SrcLocRanges[] } = {};
  coverageIndex.map(f => {
    f.covered = false;
    map[vscode.Uri.file(packageRoot + '/' + f.file).toString()] = [f];
  });
  return map;
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null;
}
