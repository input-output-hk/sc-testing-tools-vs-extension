import type { Database, PackageDocument } from '../collections';

export const getPackage = async (database: Database, packageId: TestPackageId): Promise<TestPackage> => {
  const document: PackageDocument | null = await database.packages.findOne({
    selector: { id: packageId.join(':') }
  }).exec();

  if (document === null) throw new Error(`Package not found for id: ${packageId.join(':')}`);

  return {
    name: document.packageName,
    packagePath: document.packagePath,
    workspace: {
      id: document.workspaceId,
      path: document.workspacePath,
    },
    suites: {},
    isOpen: false,
  };
}