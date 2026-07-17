import { runListScript } from '../../utils/runScript';

interface JsonTestListResult {
  event: 'suite_started';
  tests: Array<JsonTestListItem>;
}

interface JsonTestListItem {
  id: number;
  name: string;
  path: Array<string>;
  srcLoc: {
    file: string;
    endCol: number;
    endLine: number;
    startCol: number;
    startLine: number;
  };
};

const isTestListResult = (value: unknown): value is JsonTestListResult => {
  return typeof value === 'object' && value !== null && value.hasOwnProperty('event') && (value as JsonTestListResult).event === 'suite_started';
};

const buildTestList = async (params: ListTestsParams): Promise<Array<Test>> => {
  const testList: Array<Test> = [];
  for await (const output of runListScript(params.mode, params.workspacePath, params.packageName, params.suiteName)) {
    if (isTestListResult(output.parsed)) {
      const result = output.parsed as JsonTestListResult;
      for (const testItem of result.tests) {
        testList.push({
          id: `${params.packageName}:${params.suiteName}:${testItem.id}`,
          name: testItem.name,
          group: testItem.path,
          location: {
            uri: testItem.srcLoc.file,
            startLine: testItem.srcLoc.startLine,
            startCharacter: testItem.srcLoc.startCol,
            endLine: testItem.srcLoc.endLine,
            endCharacter: testItem.srcLoc.endCol,
          },
          status: 'undetermined',
        });
      }
    }
  }
  return testList;
};

export default buildTestList;