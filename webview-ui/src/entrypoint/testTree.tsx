import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import TestTreeView from '../webview/testTree';
import '../style.css';

const vscode = acquireVsCodeApi();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TestTreeView vscode={vscode} />
  </StrictMode>,
);
