import * as vscode from 'vscode';
import { PbtContext } from '../extension';
import { GenericWebviewViewProvider } from '../utils/webview';

export default class TestCoverageView {
    private context: PbtContext;
    private vebview: vscode.Webview | null = null;

    constructor() {
        this.context = {} as PbtContext;
        
    }
    public activate(context: PbtContext) {
        const TestConfigurationProvider = new GenericWebviewViewProvider(context.extension.extensionUri, 'testCoverage', this.onWebviewResolved.bind(this));
        const TestConfigurationPanel = vscode.window.registerWebviewViewProvider('pbt-test-coverage', TestConfigurationProvider);
        context.extension.subscriptions.push(TestConfigurationPanel);
        
        this.context = context;
    }

    private onWebviewResolved(webview: vscode.Webview): void {
        this.vebview = webview;
    }
} 