import * as rpc from 'vscode-jsonrpc/node';

import { discoverPackages } from './discover';

export default class TestListMethod {

  private connection: rpc.MessageConnection;

  constructor(connection: rpc.MessageConnection) {
    this.connection = connection;

    const listSuitesRequest = new rpc.RequestType<ListSuitesParams, TestPackageList, void>('listSuites');
    this.connection.onRequest(listSuitesRequest, this.listSuites.bind(this));
  }
  
  private async listSuites(params: ListSuitesParams): Promise<TestPackageList> {
    const packageList: TestPackageList = {};

    for (const workspacePath of params.workspacePaths) {
      let discoveredPackages;
      try {
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
