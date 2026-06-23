import { spawn } from 'child_process';
import * as path from 'path';

export interface BuildTestTreeResult {
  rawOutput: string;
  parsed: unknown;
}

export interface BuildTestTreeErrorData {
  message: string;
  exitCode?: number | null;
  stdout?: string;
  stderr?: string;
}

export class BuildTestTreeExecutionError extends Error {
  public readonly data: BuildTestTreeErrorData;

  constructor(message: string, data: BuildTestTreeErrorData) {
    super(message);
    this.name = 'BuildTestTreeExecutionError';
    this.data = data;
  }
}

const BUILD_TEST_TREE_TIMEOUT_MS = 10 * 60 * 1000;

export async function* runBuildTestTreeScript(extensionPath: string, script: string): AsyncGenerator<BuildTestTreeResult> {
  const scriptPath = path.join(extensionPath, script);

    const child = spawn('bash', [scriptPath]);
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, BUILD_TEST_TREE_TIMEOUT_MS);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');

    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });

    for await (const chunk of child.stdout) {
      stdout += chunk.toString();
      let parts = stdout.split('\n');
      while (parts.length > 1) {
        let rawOutput = parts.shift()!;
        let parsed = null;
        try {
          parsed = JSON.parse(rawOutput);
        } catch(e) {}
        yield ({ rawOutput, parsed });
      }
      stdout = parts[0];
    }

    const exitCode = await new Promise((resolve) => {
        child.on('close', resolve);
    });

    // if (exitCode !== 0) {
    //     throw new Error(`Process exited with code ${exitCode}`);
    // }

    // child.on('error', (error) => {
    //   clearTimeout(timeout);
    //   reject(new BuildTestTreeExecutionError('Failed to start list-tests script.', {
    //     message: error.message,
    //     stdout,
    //     stderr,
    //   }));
    // });

    // child.on('close', (code) => {
    //   clearTimeout(timeout);

    //   if (timedOut) {
    //     reject(new BuildTestTreeExecutionError('list-tests script timed out.', {
    //       message: `Timed out after ${BUILD_TEST_TREE_TIMEOUT_MS}ms.`,
    //       exitCode: code,
    //       stdout,
    //       stderr,
    //     }));
    //     return;
    //   }

    //   if (code !== 0) {
    //     reject(new BuildTestTreeExecutionError('list-tests script failed.', {
    //       message: `Script exited with code ${String(code)}.`,
    //       exitCode: code,
    //       stdout,
    //       stderr,
    //     }));
    //     return;
    //   }

      // const fullOutput = stdout.trim();

      // try {
      //   const parsed = JSON.parse(fullOutput);
      //   resolve({ rawOutput: fullOutput, parsed });
      // } catch (error) {
      //   reject(new BuildTestTreeExecutionError('Failed to parse list-tests JSON output.', {
      //     message: error instanceof Error ? error.message : 'Unknown JSON parse error.',
      //     stdout: fullOutput,
      //     stderr,
      //   }));
      // }
  // });
}

function extractFirstJsonValue(output: string): string {
  const trimmed = output.trim();

  if (trimmed.length === 0) {
    throw new Error('Script output is empty.');
  }

  const firstCharIndex = trimmed.search(/[\[{]/);
  if (firstCharIndex === -1) {
    throw new Error('No JSON object or array found in script output.');
  }

  const startChar = trimmed[firstCharIndex];
  const endChar = startChar === '{' ? '}' : ']';

  let depth = 0;
  let inString = false;
  let escaping = false;

  for (let i = firstCharIndex; i < trimmed.length; i += 1) {
    const ch = trimmed[i];

    if (inString) {
      if (escaping) {
        escaping = false;
        continue;
      }
      if (ch === '\\') {
        escaping = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === startChar) {
      depth += 1;
      continue;
    }

    if (ch === endChar) {
      depth -= 1;
      if (depth === 0) {
        return trimmed.slice(firstCharIndex, i + 1);
      }
    }
  }

  throw new Error('Could not extract a complete JSON value from script output.');
}
