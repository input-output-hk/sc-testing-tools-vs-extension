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

async function* runTests(params: RunTestsParams): AsyncGenerator<TestResult> {
  const testRun = new Set<string>();
  for (const testId of params.testIds) {
    const parts = testId.split(':');
    if (parts.length >= 2) {
      testRun.add(`${parts[0]}:${parts[1]}`);
    }    
  }
  for (const testRunItem of testRun) {
    const [packageName, suiteName] = testRunItem.split(':');
    for await (const result of runRunScript(params.mode, params.workspacePath, packageName, suiteName)) {
      if (isTestRun(result.parsed)) {
        const testResult = result.parsed as JsonTestRun;
        yield ({
          id: `${packageName}:${suiteName}:${testResult.id}`,
          status: testResult.success ? 'valid' : 'invalid',
          time: testResult.duration * 1000,
        });
      }
    }
  }
};

export default runTests;