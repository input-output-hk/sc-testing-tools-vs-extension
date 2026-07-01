import * as vscode from 'vscode';
import { handleJsonRpcRequest } from './rpc/server';
import { JsonRpcRequest, JsonRpcResponse } from './rpc/types';
import { runBuildTestTreeScript } from './services/buildTestTree';

interface SrcLocRanges {
  file: string;
  startLines: number[];
  startCols: number[];
  endLines: number[];
  endCols: number[];
  covered: boolean;
  testItem?: vscode.TestItem;
}

let baseCoverageIndex: {[key: string]: SrcLocRanges[]} = {};
let coverageRanges: {
  [name: string] : {
    [file: string]: {
      [testId : string]: {
        [key: string]: vscode.StatementCoverage
      }
    }
  }
} = {};
let leaves: {[key: number]: vscode.TestItem } = {};
let testNames: {[key: number]: string } = {};
let globalKey = "#GLOBAL#";
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
    const name = (request.include||[]).map(val => val.label).join(",") || "Complete testrun";
    const run = testController.createTestRun(request, name);
    for (const leaf of Object.values(leaves)) {
      run.enqueued(leaf);
    }

    coverageRanges[name] = {};

    let coverageIndex: {[key: string]: SrcLocRanges[]} = {};
    for (let k in baseCoverageIndex)
      coverageIndex[k] = baseCoverageIndex[k].concat([]);
    let packageRoot = "";
    try {
      for await (const result of runBuildTestTreeScript(context.extensionPath, 'scripts/run-tests-json.sh')) {
        if (!result.parsed) {
          run.appendOutput("\r\n" + result.rawOutput);
          continue;
        }
        let event = result.parsed as {
          event: string,
          id: number,
          packageRoot?: string,
          covered?: SrcLocRanges[],
          success?: boolean,
          duration?: number,
          description?: string,
          percent?: number,
          trace?: {threatModels: {testId: number, covered: SrcLocRanges[] }[] }
        };
        let leaf = leaves[event.id];
        if (!(event.event in {test_trace:1, test_progress:1}))
          outputChannel.appendLine(`${event.event} ${event.id===undefined?"":event.id}`);
        if (event.packageRoot) {
          packageRoot = event.packageRoot;
        }
        if (event.covered) {
          event.covered.map(f => {
            f.covered = true;
            f.testItem = leaf;

            let uri = vscode.Uri.file(packageRoot + '/' + f.file).toString();
            if (!request.include || request.include.find(l => l == leaf)) {
              coverageIndex[uri] ||= [];
              coverageIndex[uri].push(f);
            }
          });
        }
        if (leaf) {
          switch (event.event) {
            case "test_started":
              run.started(leaf);
              run.appendOutput(`\r\n${leaf.label}`, undefined, leaf);
              break;
            case "test_progress":
              if (event.description)
                run.appendOutput(`\r\n  ${event.description.replace(/\n/g, "\r\n  ")}`, undefined, leaf);
              if (event.percent)
                leaf.label = `${testNames[event.id]} (${Math.floor(event.percent*100)}%)`;
              break;
            case "test_trace":
              if (event.trace) {
                event.trace.threatModels.map(tm => {
                  let tmLeaf = leaves[tm.testId];
                  tm.covered.map(f => {
                    f.covered = true;
                    f.testItem = tmLeaf;

                    let uri = vscode.Uri.file(packageRoot + '/' + f.file).toString();
                    if (!request.include || request.include.find(l => l == tmLeaf)) {
                      coverageIndex[uri] ||= [];
                      coverageIndex[uri].push(f);
                    }
                  });
                })
              }
              break;
            case "test_done":
              leaf.label = testNames[event.id];
              if (event.success) {
                run.passed(leaf, event.duration && event.duration * 1000);
              } else {
                run.failed(leaf, new vscode.TestMessage(event.description || "-- no output --"), event.duration && event.duration * 1000);
              }
              if (event.description)
                run.appendOutput(`\r\n  ` + event.description.replace(/\n/g, "\r\n  "), undefined, leaf);
              break;
          }
        }
      }
    } catch(e) {
      outputChannel.appendLine("Error while running tests: ");
      outputChannel.appendLine(JSON.stringify(e));
      console.error(e);
    }

    for (let file in coverageIndex) {
      let covDatas = coverageIndex[file];
      coverageRanges[name][file] ||= {};
      coverageRanges[name][file][globalKey] ||= {};

      let testItems: {[k: string]: vscode.TestItem} = {};

      for (const covData of covDatas) {
        let testItemId:string;
        if (covData.testItem) {
          testItems[covData.testItem.id] = covData.testItem;
          testItemId = covData.testItem.id;
          coverageRanges[name][file][testItemId] ||= {};
        }
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
          if (!coverageRanges[name][file][globalKey][key]?.executed)
            coverageRanges[name][file][globalKey][key] = cov;
          if (testItemId && !coverageRanges[name][file][testItemId][key]?.executed) {
            coverageRanges[name][file][testItemId][key] = cov;
          }
        })
      }

      let fileCoverage = vscode.FileCoverage.fromDetails(vscode.Uri.parse(file), Object.values(coverageRanges[name][file][globalKey]));
      fileCoverage.includesTests = Object.values(testItems);
      run.addCoverage(fileCoverage);
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

  function loadDetailedCoverageForTest(testRun: vscode.TestRun, coverage: vscode.FileCoverage, testItemId: string) {
    outputChannel.appendLine(`loadDetailedCoverageForTest ${testItemId}`)
    if (!testRun.name || !coverageRanges[testRun.name]) {
      outputChannel.appendLine(`No coverage found for ${testRun.name}, only for ${Object.keys(coverageRanges)}`);
      return [];
    }
    let allDetails = coverageRanges[testRun.name][coverage.uri.toString()];
    if (!allDetails) {
      outputChannel.appendLine(`No coverage found for ${coverage.uri}, only for ${Object.keys(coverageRanges[testRun.name])}`);
      return [];
    }
    let details = allDetails[testItemId];
    if (!details) {
      outputChannel.appendLine(`No coverage found for ${testItemId}, only for ${Object.keys(allDetails)}`);
      return [];
    }
    return Object.values(details);
  }

  coverageProfile.loadDetailedCoverage = async (testRun, coverage) => {
    return loadDetailedCoverageForTest(testRun, coverage, globalKey);
  }

  coverageProfile.loadDetailedCoverageForTest = async (testRun, coverage, fromTestItem) => {
    return loadDetailedCoverageForTest(testRun, coverage, fromTestItem.id);
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
    leaves[test.id] = leaf;
    testNames[test.id] = test.name;
    parent.children.add(leaf);
  }

  testController.items.replace([rootItem]);

  baseCoverageIndex = extractCoverageIndex(response.result);

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
