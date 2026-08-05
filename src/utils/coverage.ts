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

export function renderCoverageForEditor(
  editor: vscode.TextEditor,
  statements: CoverageStatements,
) {
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

export function clearCoverageForEditor(editor: vscode.TextEditor) {
  editor.setDecorations(coveredStyle, []);
  editor.setDecorations(uncoveredStyle, []);
}