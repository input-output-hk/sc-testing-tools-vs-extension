import * as vscode from 'vscode';
import { StatementCoverage } from '../services/store/testStore';

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

export function renderCoverageForEditor(
  editor: vscode.TextEditor,
  coverage: StatementCoverage[],
) {
  editor.setDecorations(coveredStyle, coverage.filter(cov => cov.executed > 0));
  editor.setDecorations(uncoveredStyle, coverage.filter(cov => cov.executed == 0));
}