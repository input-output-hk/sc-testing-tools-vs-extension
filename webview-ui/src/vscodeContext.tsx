import { createContext, useContext } from 'react';

import type { WebviewApi } from 'vscode-webview';

const VscodeContext = createContext<WebviewApi<unknown> | null>(null);

interface VscodeProviderProps {
  vscode: WebviewApi<unknown>;
  children: React.ReactNode;
}

export const VscodeProvider: React.FC<VscodeProviderProps> = ({ vscode, children }) => (
  <VscodeContext.Provider value={vscode}>{children}</VscodeContext.Provider>
);

export const useVscode = (): WebviewApi<unknown> => useContext(VscodeContext)!;
