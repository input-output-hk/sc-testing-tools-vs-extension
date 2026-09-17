import { buildWorkspacePackages } from './buildList';
import { discoverPackagesForWorkspace } from './discover';

export async function prefetch(workspaces: Array<Workspace>): Promise<StaticTestTree> {
  const packages: StaticTestTree['packages'] = {};

  for (const workspace of workspaces) {
    const discoveredPackages = await discoverPackagesForWorkspace(workspace.path);
    const workspacePackages = await buildWorkspacePackages(workspace, discoveredPackages);
    mergePackages(packages, workspacePackages);
  }

  return { packages };
}

function mergePackages(
  target: StaticTestTree['packages'],
  source: StaticTestTree['packages'],
): void {
  for (const [packageId, sourcePackage] of Object.entries(source)) {
    const existing = target[packageId];
    if (!existing) {
      target[packageId] = sourcePackage;
      continue;
    }

    for (const [suiteName, suite] of Object.entries(sourcePackage.suites)) {
      if (!existing.suites[suiteName]) {
        existing.suites[suiteName] = suite;
      }
    }
  }
}
