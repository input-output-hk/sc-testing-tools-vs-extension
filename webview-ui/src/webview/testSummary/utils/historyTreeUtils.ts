export type HistoryTestNode = {
  type: 'test';
  key: string;
  runId: string;
  test: TestResultHistory;
  name: string;
  description: string;
  status: RunStatusContext;
};

export type HistoryThreatModelsNode = {
  type: 'threat-models';
  key: string;
  description: string;
  status: RunStatusContext;
  tests: Array<HistoryTestNode>;
};

export type HistoryNode = HistoryTestNode | HistoryThreatModelsNode;

export type HistoryRunNode = {
  runId: string;
  status: TestJobStatus;
  startedOn: number;
  nodes: Array<HistoryNode>;
};

const getLocation = (id: TestId, group: Array<string>): string =>
  [id[1], id[2], ...group].join(' > ');

const compareNodes = (a: HistoryNode, b: HistoryNode): number =>
  a.description.localeCompare(b.description);

const buildRunNode = (run: TestRunHistory, names: GenericMap<string>, activeRunId: string | null): HistoryRunNode => {
  const isRunActive = run.runId === activeRunId;
  const nodes: Array<HistoryNode> = [];
  const threatModels: GenericMap<HistoryThreatModelsNode> = {};

  for (const test of run.tests) {
    if (test.type === undefined || test.type === 'unit-test') continue;
    const isRunning = isRunActive && test.status === 'undetermined';
    if (test.status === 'undetermined' && !isRunning) continue;

    const location = getLocation(test.id, test.group);
    const testNode: HistoryTestNode = {
      type: 'test',
      key: `${run.runId}:${test.id.join(':')}`,
      runId: run.runId,
      test,
      name: names[test.id.join(':')] ?? test.id[3],
      description: location,
      status: { status: test.status, isWaiting: false, isRunning },
    };

    if (test.type !== 'threat-model') {
      nodes.push(testNode);
      continue;
    }

    const folderKey = `${run.runId}:${test.id[0]}:${location}`;
    let folder = threatModels[folderKey];
    if (folder === undefined) {
      folder = { type: 'threat-models', key: folderKey, description: location, status: { status: 'valid', isWaiting: false, isRunning: false }, tests: [] };
      threatModels[folderKey] = folder;
      nodes.push(folder);
    }
    folder.tests.push(testNode);
    if (isRunning) folder.status.isRunning = true;
    if (test.status === 'invalid') folder.status.status = 'invalid';
  }

  nodes.sort(compareNodes);
  return { runId: run.runId, status: run.status, startedOn: run.startedOn, nodes };
};

export const buildHistoryTree = (history: TestSummaryHistory): Array<HistoryRunNode> => {
  const runs: Array<HistoryRunNode> = [];
  for (const run of history.runs) {
    runs.push(buildRunNode(run, history.names, history.activeRunId));
  }
  return runs;
};

const matchesTest = (node: HistoryTestNode, filter: TestTreeFilter): boolean => {
  const text = filter.text?.trim().toLowerCase();
  if (text && !node.name.toLowerCase().includes(text) && !node.description.toLowerCase().includes(text)) return false;
  if (filter.status !== undefined && node.test.status !== filter.status) return false;
  if (filter.type !== undefined && node.test.type !== filter.type) return false;
  return true;
};

const filterNodes = (nodes: Array<HistoryNode>, filter: TestTreeFilter): Array<HistoryNode> => {
  const result: Array<HistoryNode> = [];
  for (const node of nodes) {
    if (node.type === 'test') {
      if (matchesTest(node, filter)) result.push(node);
      continue;
    }
    const tests: Array<HistoryTestNode> = [];
    for (const test of node.tests) {
      if (matchesTest(test, filter)) tests.push(test);
    }
    if (tests.length > 0) result.push({ ...node, tests });
  }
  return result;
};

export const isFilterActive = (filter: TestTreeFilter): boolean =>
  !!filter.text?.trim() || filter.status !== undefined || filter.type !== undefined;

export const filterHistoryTree = (runs: Array<HistoryRunNode>, filter: TestTreeFilter): Array<HistoryRunNode> => {
  if (!isFilterActive(filter)) return runs;
  const result: Array<HistoryRunNode> = [];
  for (const run of runs) {
    const nodes = filterNodes(run.nodes, filter);
    if (nodes.length > 0) result.push({ ...run, nodes });
  }
  return result;
};
