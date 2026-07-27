import * as vscode from 'vscode';
import TestStore, { StatementCoverage, ALL_TESTS_KEY } from '../services/store/testStore';

const coveredStyle = vscode.window.createTextEditorDecorationType({
  backgroundColor: 'rgba(80, 200, 80, 0.15)',
  overviewRulerColor: 'rgba(80, 200, 80, 0.8)',
  overviewRulerLane: vscode.OverviewRulerLane.Left,
});

const uncoveredStyle = vscode.window.createTextEditorDecorationType({
  backgroundColor: 'rgba(255, 56, 56, 0.25)',
  overviewRulerColor: 'rgba(255, 56, 56, 0.8)',
  overviewRulerLane: vscode.OverviewRulerLane.Left,
});

export function renderCoverageForEditor(
  editor: vscode.TextEditor,
  coverage: StatementCoverage[],
) {
  editor.setDecorations(coveredStyle, coverage.filter(cov => cov.executed > 0));
  editor.setDecorations(uncoveredStyle, coverage.filter(cov => cov.executed == 0));
}

interface QuickPickTestItem extends vscode.QuickPickItem {
  testId: string;
}

export function selectCoverageFilter(testStore: TestStore) {
  return async () => {
    let tests = testStore.getTestsWithCoverage() || [];
    let current = testStore.getShowingCoverageForTestId();

    const richOptions: QuickPickTestItem[] = [{
        label: 'Complete run.',
        detail: 'Show coverage for the complete test run.',
        testId: ALL_TESTS_KEY,
        picked: current == ALL_TESTS_KEY
      }, ...tests.map(test => ({
        label: test.name,
        description: test.compareCoverageTo ? 'Coverage relative to Positive Tests' : '',
        detail: test.group.slice(1).join('/'),
        testId: test.id,
        picked: current == test.id
      }))
    ];

    const selection = await vscode.window.showQuickPick(richOptions, {
      placeHolder: 'Filter the coverage by',
    });

    if (selection) {
      testStore.showCoverageForTestId(selection.testId);
    }
  }
}