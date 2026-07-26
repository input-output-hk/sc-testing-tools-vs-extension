import * as rpc from 'vscode-jsonrpc/node';

import { discoverPackages } from './discover';

export default class ListTestsMethod {

  private connection: rpc.MessageConnection;

  constructor(connection: rpc.MessageConnection) {
    this.connection = connection;

    const listTestsRequest = new rpc.RequestType<ListTestsParams, TestPackageData, void>('listTests');
    this.connection.onRequest(listTestsRequest, this.listTests.bind(this));
  }

  private async listTests(params: ListTestsParams): Promise<TestPackageData> {
    const packageList: TestPackageList = {};
    const tests: TestList = {};

    for (const workspacePath of params.workspacePaths) {
      let discoveredPackages;
      try {
        discoveredPackages = await discoverPackages(workspacePath);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Unable to list tests for workspace ${workspacePath}: ${message}`);
      }

      for (const discoveredPackage of discoveredPackages) {
        if (!packageList[discoveredPackage.name]) {
          packageList[discoveredPackage.name] = {
            name: discoveredPackage.name,
            workspacePath: workspacePath,
            packagePath: discoveredPackage.packagePath,
            isOpen: true,
            suites: {},
          };
        }

        const suites = packageList[discoveredPackage.name].suites;
        for (const discoveredSuite of discoveredPackage.suites) {
          if (suites[discoveredSuite.name]) {
            continue;
          }

          for (const test of discoveredSuite.tests) {
            tests[test.id] = test;
          }

          suites[discoveredSuite.name] = {
            name: discoveredSuite.name,
            isOpen: false,
            status: 'undetermined',
            tree: discoveredSuite.tree,
          };
        }
      }
    }

    return {
      packages: packageList,
      tests,
    };
  };

}
