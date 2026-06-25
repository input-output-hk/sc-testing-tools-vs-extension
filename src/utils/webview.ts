import * as vscode from 'vscode';
import * as fs from 'fs';

export function getWebviewHtml(webview: vscode.Webview, extensionUri: vscode.Uri, webviewName: string): string {
  const webviewFolderPath = vscode.Uri.joinPath(extensionUri, 'build');
  const indexHtmlPath = vscode.Uri.joinPath(webviewFolderPath, `${webviewName}.html`);
  const webviewBaseUri = webview.asWebviewUri(webviewFolderPath).toString();
  const normalizedBaseUri = webviewBaseUri.endsWith('/') ? webviewBaseUri : `${webviewBaseUri}/`;

  let html = fs.readFileSync(indexHtmlPath.fsPath, 'utf-8');

  // Rewrite links (src/href) to use webview.asWebviewUri
  html = html.replace(/(src|href)="(.+?)"/g, (_, attr, file) => {
    const assetPath = vscode.Uri.joinPath(webviewFolderPath, file);
    const uri = webview.asWebviewUri(assetPath);
    return `${attr}="${uri}"`;
  }).replace(/crossorigin/g, '');

  // Ensure runtime relative URLs (e.g. from React code) resolve under build/.
  html = html.replace('<head>', `<head>\n    <base href="${normalizedBaseUri}">`);

  return html;
}