import * as vscode from 'vscode';
import { PbtContext } from '../extension';
import { GenericWebviewViewProvider } from '../utils/webview';

export default class TestCoverageView {
    private context: PbtContext;
    private webview: vscode.Webview | null = null;

    constructor() {
        this.context = {} as PbtContext;
    }

    public activate(context: PbtContext) {
        this.context = context;

        const TestCoverageProvider = new GenericWebviewViewProvider(context.extension.extensionUri, 'testCoverage', this.onWebviewResolved.bind(this));
        const TestCoveragePanel = vscode.window.registerWebviewViewProvider('pbt-test-coverage', TestCoverageProvider);
        context.extension.subscriptions.push(TestCoveragePanel);
    }

    private onWebviewResolved(webview: vscode.Webview): void {
        this.webview = webview;

        this.context.store.testStore.onCoverageUpdate((file) => this.sendCoverageUpdate(file));

        this.webview.onDidReceiveMessage(
            (message: WebviewToExtensionMessage) => {
                switch (message.type) {
                    case 'webview-ready':
                        this.sendCoverageSummary();
                        break;
                }
            },
            undefined,
            this.context.extension.subscriptions
        );
    }

    private async sendCoverageSummary(): Promise<void> {
        const files = await this.context.store.testStore.getCoverageSummary();
        this.webview?.postMessage({ type: 'coverage-summary', payload: { files } } as ExtensionToWebviewMessage);
    }

    private sendCoverageUpdate(file: CoverageFileSummary): void {
        this.webview?.postMessage({ type: 'coverage-update', payload: { file } } as ExtensionToWebviewMessage);
    }
}
