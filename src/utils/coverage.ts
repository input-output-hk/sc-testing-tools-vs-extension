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

export const getFileCoverageStats = async (fileCoverage: FileCoverage): Promise<FileCoverageWithStats> => {
  const fileBuffer = await vscode.workspace.fs.readFile(vscode.Uri.file(fileCoverage.filePath));
  const fileContent = Buffer.from(fileBuffer).toString('utf-8');
  const fileLines = fileContent.split('\n');
  const total = fileContent.length;
  const covered = Object.entries(fileCoverage.statements).reduce((acc, [rangeKey, testIds]) => {
    if (testIds.length > 0) {
      const [startLine, startChar, endLine, endChar] = rangeKey.split(':').map(Number);
      let rangeLength = 0;
      for (let line = startLine; line <= endLine; line++) {
        if (line === startLine && line === endLine) {
          rangeLength += endChar - startChar;
        } else if (line === startLine) {
          rangeLength += fileLines[line].length - startChar + 1; // +1 for newline
        } else if (line === endLine) {
          rangeLength += endChar;
        } else {
          rangeLength += fileLines[line].length + 1; // +1 for newline
        }
      }
      return acc + rangeLength;
    }
    return acc;
  }, 0);

  return {
    ...fileCoverage,
    stats: { total, covered },
  };
}
