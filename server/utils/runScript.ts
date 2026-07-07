import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface ScriptResult {
  rawOutput: string;
  parsed: unknown;
}

function getListScriptPath(mode: string): string {
  return path.join(getScriptBasePath(), `${mode}-list-tests-json.sh`);
}

function getRunScriptPath(mode: string): string {
  return path.join(getScriptBasePath(), `${mode}-run-tests-json.sh`);
}

function getScriptBasePath(): string {
  return path.join(__dirname, '..', '..', '..', 'scripts');
}

function getListScriptParams(workspacePath: string, packageName: string, suiteName: string): Array<string> {
  return [workspacePath, packageName, suiteName];
}

function getRunScriptParams(workspacePath: string, packageName: string, suiteName: string): Array<string> {
  return [workspacePath, packageName, suiteName];
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

async function* runScript(scriptPath: string, params?: string[]): AsyncGenerator<ScriptResult> {
  const child = spawn(locateBash(), [scriptPath, ...(params || [])]);

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

export async function* runListScript(mode: string, workspacePath: string, packageName: string, suiteName: string): AsyncGenerator<ScriptResult> {
  const scriptPath = getListScriptPath(mode);
  const params = getListScriptParams(workspacePath, packageName, suiteName);
  for await (const result of runScript(scriptPath, params)) yield result;
}

export async function* runRunScript(mode: string, workspacePath: string, packageName: string, suiteName: string): AsyncGenerator<ScriptResult> {
  const scriptPath = getRunScriptPath(mode);
  const params = getRunScriptParams(workspacePath, packageName, suiteName);
  for await (const result of runScript(scriptPath, params)) yield result;
}
