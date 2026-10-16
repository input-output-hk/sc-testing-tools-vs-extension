import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import TestSummaryView from '../webview/testSummary';
import '../style.css';

const vscode = acquireVsCodeApi();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TestSummaryView vscode={vscode} />
  </StrictMode>,
);
