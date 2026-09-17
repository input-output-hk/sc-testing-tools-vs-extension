import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '../style.css';
import TestCoverageView from '../webview/testCoverage';

const vscode = acquireVsCodeApi();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TestCoverageView vscode={vscode} />
  </StrictMode>,
);
