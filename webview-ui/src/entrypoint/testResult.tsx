import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import TestResultView from '../webview/testResult';
import '../style.css';

const vscode = acquireVsCodeApi();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TestResultView vscode={vscode} />
  </StrictMode>,
);
