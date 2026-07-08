import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import TestCustomizationView from '../webview/testCustomization';
import '../style.css';

const vscode = acquireVsCodeApi();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TestCustomizationView vscode={vscode} />
  </StrictMode>,
);
