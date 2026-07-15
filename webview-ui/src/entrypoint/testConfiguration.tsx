import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import TestConfigurationView from '../webview/testConfiguration';
import '../style.css';

const vscode = acquireVsCodeApi();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TestConfigurationView vscode={vscode} />
  </StrictMode>,
);
