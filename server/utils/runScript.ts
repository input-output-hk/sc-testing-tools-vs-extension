import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface ScriptResult {
  rawOutput: string;
  parsed: unknown;
}

export class ScriptExecutionError extends Error {
  public readonly data: ScriptExecutionErrorData;

  constructor(data: ScriptExecutionErrorData, message: string) {
    super(message);
    this.name = 'ScriptExecutionError';
    this.data = data;
  }
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

function getRunScriptParams(workspacePath: string, packageName: string, suiteName: string, testIds: Array<number>): Array<string> {
  return [workspacePath, packageName, suiteName, testIds.join(',')];
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

function buildScriptExecutionMessage(data: ScriptExecutionErrorData): string {
  const exitCode = data.exitCode === null ? 'unknown' : String(data.exitCode);
  const commandOutput = data.stderr.trim() || data.stdout.trim();
  if (commandOutput.length > 0) {
    return `Script ${path.basename(data.scriptPath)} failed (exit code ${exitCode}): ${commandOutput}`;
  }
  return `Script ${path.basename(data.scriptPath)} failed (exit code ${exitCode})`;
}

async function* runScript(scriptPath: string, params?: string[]): AsyncGenerator<ScriptResult> {
  const scriptParams = params ?? [];
  const child = spawn(locateBash(), [scriptPath, ...scriptParams], { env: process.env });
  const processStatePromise = new Promise<{ exitCode: number | null; spawnError: Error | null }>((resolve) => {
    child.once('error', (spawnError: Error) => resolve({ exitCode: null, spawnError }));
    child.once('close', (exitCode: number | null) => resolve({ exitCode, spawnError: null }));
  });

  let stdoutBuffer = '';
  let stdout = '';
  let stderr = '';

  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');

  child.stderr.on('data', (chunk: string) => {
    stderr += chunk;
  });

  for await (const chunk of child.stdout) {
    const content = chunk.toString();
    stdout += content;
    stdoutBuffer += content;
    let parts = stdoutBuffer.split('\n');
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
    stdoutBuffer = parts[0];
  }

  const finalOutput = stdoutBuffer.trim();
  if (finalOutput.length > 0) {
    try {
      const parsed = JSON.parse(stdoutBuffer);
      yield ({ rawOutput: stdoutBuffer, parsed });
    } catch {
      console.error('JSON line parsing failed:\n', stdoutBuffer);
    }
  }

  const processState = await processStatePromise;

  if (processState.spawnError !== null) {
    const data: ScriptExecutionErrorData = {
      kind: 'script-execution-error',
      scriptPath,
      params: scriptParams,
      exitCode: null,
      stderr,
      stdout,
    };
    throw new ScriptExecutionError(data, `Unable to run script ${path.basename(scriptPath)}: ${processState.spawnError.message}`);
  }
}

export async function* runListScript(mode: string, workspacePath: string, packageName: string, suiteName: string): AsyncGenerator<ScriptResult> {
  const scriptPath = getListScriptPath(mode);
  const params = getListScriptParams(workspacePath, packageName, suiteName);
  for await (const result of runScript(scriptPath, params)) yield result;
}

export async function* runRunScript(mode: string, workspacePath: string, packageName: string, suiteName: string, testIds: Array<number>): AsyncGenerator<ScriptResult> {
  const scriptPath = getRunScriptPath(mode);
  const params = getRunScriptParams(workspacePath, packageName, suiteName, testIds);
  for await (const result of runScript(scriptPath, params)) yield result;
}
