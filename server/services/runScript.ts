import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface ScriptResult {
  rawOutput: string;
  parsed: unknown;
}

function locateBash(): string {
  if (process.platform !== 'win32') return 'bash';
  const candidates = [
    'C:\\Program Files\\Git\\bin\\bash.exe',
    'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('Git Bash not found on Windows');
}

export async function* runScript(script: string): AsyncGenerator<ScriptResult> {
  const scriptPath = path.join(__dirname, '..', '..', '..', 'scripts', script);
  const child = spawn(locateBash(), [scriptPath]);

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
      if (!rawOutput.trim()) continue;
      try {
        const parsed = JSON.parse(rawOutput);
        yield ({ rawOutput, parsed });
      } catch {
        console.error('JSON line parsing failed:\n', rawOutput);
      }
    }
    stdout = parts[0];
  }

  const exitCode = await new Promise((resolve) => {
    child.on('close', resolve);
  });

  if (exitCode !== 0) {
    console.error('Process stderr:\n', stderr);
    throw new Error(`Process exited with code ${exitCode}`);
  }
}