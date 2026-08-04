import React, {useEffect} from 'react';
import type { WebviewApi } from 'vscode-webview';


interface Props {
  vscode: WebviewApi<unknown>;
}


const TestSummaryView: React.FC<Props> = ({ vscode }) => {
  
     useEffect(() => {
    vscode.postMessage({ type: 'webview-ready' } as WebviewToExtensionMessage);
  }, [vscode]);

  return (
    <div>
      Test Summary View
    </div>
  );
};

export default TestSummaryView;
