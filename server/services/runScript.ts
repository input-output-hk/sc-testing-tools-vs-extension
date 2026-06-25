import { spawn } from 'child_process';
import * as path from 'path';

export interface ScriptResult {
  rawOutput: string;
  parsed: unknown;
}

export async function* runScript(script: string): AsyncGenerator<ScriptResult> {
  const scriptPath = path.join(__dirname, '..', '..', '..', 'scripts', script);
  const child = spawn('bash', [scriptPath]);
  let stdout = '';
  let stderr = '';

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
      const parsed = JSON.parse(rawOutput);
      yield ({ rawOutput, parsed });
    }
    stdout = parts[0];
  }

  const exitCode = await new Promise((resolve) => {
    child.on('close', resolve);
  });

  if (exitCode !== 0) {
    throw new Error(`Process exited with code ${exitCode}`);
  }
}
