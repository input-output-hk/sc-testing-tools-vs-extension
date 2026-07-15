import { runRunScript } from '../../utils/runScript';

interface JsonTestRun {
  id: number;
  event: 'test_done';
  success: boolean;
  duration: number;
}

const isTestRun = (value: unknown): value is JsonTestRun => {
  return typeof value === 'object' && value !== null && value.hasOwnProperty('event') && (value as JsonTestRun).event === 'test_done';
};

async function* runTests(params: RunTestsParams): AsyncGenerator<TestRunResult> {
  for await (const result of runRunScript(params.mode, params.workspacePath, params.packageName, params.suiteName, params.testIds)) {
    if (isTestRun(result.parsed)) {
      const testResult = result.parsed as JsonTestRun;
      yield ({
        id: `${params.packageName}:${params.suiteName}:${testResult.id}`,
        status: testResult.success ? 'valid' : 'invalid',
        time: testResult.duration * 1000,
      });
    }
  }
};

export default runTests;