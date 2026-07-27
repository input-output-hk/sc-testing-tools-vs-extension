import * as rpc from 'vscode-jsonrpc/node';

import { discoverPackages } from './discover';

export default class TestListMethod {

  private connection: rpc.MessageConnection;

  constructor(connection: rpc.MessageConnection) {
    this.connection = connection;

    const listSuitesRequest = new rpc.RequestType<ListSuitesParams, TestPackageList, void>('listSuites');
    this.connection.onRequest(listSuitesRequest, this.listSuites.bind(this));
  }
  
  // Handler for the 'listSuites' RPC request (registered in the constructor above).
  // For each workspace folder path sent by the client, scans the filesystem for cabal
  // packages/test-suites (via discoverPackages) and merges everything into a single
  // TestPackageList keyed by package name, deduping suites that already appeared for
  // an earlier workspace path. This is the payload rpcClient.listSuites() resolves with,
  // and what testStore caches as `packages` for rendering the tree in the webview.
  private async listSuites(params: ListSuitesParams): Promise<TestPackageList> {
    const packageList: TestPackageList = {};

    for (const workspacePath of params.workspacePaths) {
      let discoveredPackages;
      try {
        // Walk this workspace path for .cabal files and parse out package/suite names
        discoveredPackages = await discoverPackages(workspacePath);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Unable to list suites for workspace ${workspacePath}: ${message}`);
      }

      for (const discoveredPackage of discoveredPackages) {
        if (discoveredPackage.suites.length === 0) {
          continue;
        }

        if (!packageList[discoveredPackage.name]) {
          packageList[discoveredPackage.name] = {
            name: discoveredPackage.name,
            path: workspacePath,
            isOpen: true,
            suites: {},
          };
        }

        const suites = packageList[discoveredPackage.name].suites;
        for (const discoveredSuite of discoveredPackage.suites) {
          if (suites[discoveredSuite.name]) {
            continue;
          }

          suites[discoveredSuite.name] = {
            name: discoveredSuite.name,
            isOpen: true,
            status: 'pending',
            tree: {},
          };
        }
      }
    }

    return packageList;
  };

}
