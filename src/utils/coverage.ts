import * as vscode from 'vscode';

const coveredStyle = vscode.window.createTextEditorDecorationType({
  backgroundColor: 'rgba(80, 200, 80, 0.15)',
  overviewRulerColor: 'rgba(80, 200, 80, 0.8)',
  overviewRulerLane: vscode.OverviewRulerLane.Left,
});

const uncoveredStyle = vscode.window.createTextEditorDecorationType({
  backgroundColor: 'rgba(200, 80, 80, 0.5)',
  overviewRulerColor: 'rgba(200, 80, 80, 0.8)',
  overviewRulerLane: vscode.OverviewRulerLane.Left,
});

const keyToRange = (key: string): vscode.Range => {
  const [startLine, startChar, endLine, endChar] = key.split(':').map(Number);
  return new vscode.Range(
    new vscode.Position(startLine, startChar),
    new vscode.Position(endLine, endChar)
  );
};

export const renderCoverageForEditor = (
  editor: vscode.TextEditor,
  statements: CoverageStatements,
) => {
  const covered: Array<vscode.Range> = [];
  const uncovered: Array<vscode.Range> = [];
  for (const [rangeKey, testIds] of Object.entries(statements)) {
    if (testIds.length > 0) {
      covered.push(keyToRange(rangeKey));
    } else {
      uncovered.push(keyToRange(rangeKey));
    }
  }

  editor.setDecorations(coveredStyle, covered);
  editor.setDecorations(uncoveredStyle, uncovered);
}

export const clearCoverageForEditor = (editor: vscode.TextEditor) => {
  editor.setDecorations(coveredStyle, []);
  editor.setDecorations(uncoveredStyle, []);
}

const getFilePath = (file: FileCoverage): Array<string> => {
  const segments = file.filePath
    .slice(file.context.basePath.length).replace(/^[\\/]+/, '')
    .split(/[\\/]/).filter(Boolean)
  
  const path = [
    `${file.context.workspaceId}:${file.context.packageName}`,
    file.context.suiteName,
    ...segments
  ];

  return path;
}

const buildCoverageTreeNode = (
  rootNode: CoverageTreeFolderNode,
  file: FileCoverage,
  openState: Record<string, boolean>
): void => {
  const path = getFilePath(file);
  const groups = path.slice(0, -1);
  const fileName = path.pop()!;

  let node = rootNode;
  const currentPath: Array<string> = [];
  for (const segment of groups) {
    currentPath.push(segment);
    if (!node.nodes[segment]) {
      const nodePath = currentPath.join(':');
      if (!Object.hasOwn(openState, nodePath)) {
        openState[nodePath] = true;
      }
      node.nodes[segment] = {
        name: segment.split(':').pop(),
        total: 0,
        covered: 0,
        isOpen: openState[nodePath],
        nodes: {},
      } as CoverageTreeFolderNode;
    }
    node = node.nodes[segment] as CoverageTreeFolderNode;
    node.covered += file.covered;
    node.total += file.total;
  }

  node.nodes[fileName] = {
    name: fileName,
    path: file.filePath,
    total: file.total,
    covered: file.covered,  
  } as CoverageTreeFileNode;
};

export const buildCoverageTree = (
  files: Array<FileCoverage>,
  openState: Record<string, boolean>
): CoverageTree => {
  const coverageTreeRoot: CoverageTreeFolderNode = {
    name: 'root',
    total: 0,
    covered: 0,
    isOpen: true,
    nodes: {}
  };

  for (const file of files) {
    buildCoverageTreeNode(coverageTreeRoot, file, openState);
  }

  return coverageTreeRoot.nodes;
};

export const updateCoverageTree = (
  coverageTree: CoverageTree,
  file: FileCoverage,
  openState: Record<string, boolean>
): void => {
  const nodes: Array<CoverageTreeNode> = [];

  let node: CoverageTreeFolderNode = {
    name: 'root',
    total: 0,
    covered: 0,
    isOpen: true,
    nodes: coverageTree,
  };
  
  const path = getFilePath(file);
  const groups = path.slice(0, -1);
  const fileName = path.pop()!;
  
  const currentPath: Array<string> = [];
  for (const segment of groups) {
    currentPath.push(segment);
    if (!node.nodes[segment]) {
      const nodePath = currentPath.join(':');
      if (!Object.hasOwn(openState, nodePath)) {
        openState[nodePath] = true;
      }
      node.nodes[segment] = {
        name: segment.split(':').pop(),
        total: 0,
        covered: 0,
        isOpen: openState[nodePath],
        nodes: {},
      } as CoverageTreeFolderNode;
    }
    node = node.nodes[segment] as CoverageTreeFolderNode;
    nodes.unshift(node);
  }

  node.nodes[fileName] = {
    name: fileName,
    path: file.filePath,
    total: file.total,
    covered: file.covered,  
  } as CoverageTreeFileNode;

  for (const node of nodes as Array<CoverageTreeFolderNode>) {
    node.total = Object.values(node.nodes).reduce((sum, node) => sum + node.total, 0);
    node.covered = Object.values(node.nodes).reduce((sum, node) => sum + node.covered, 0);
  }
};