import { spawn, type ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface ScriptOutput {
  child: ChildProcess;
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

function getBuildScriptPath(mode: string): string {
  return path.join(getScriptBasePath(), `${mode}-list.sh`);
}

function getRunScriptPath(mode: string): string {
  return path.join(getScriptBasePath(), `${mode}-run.sh`);
}

function getScriptBasePath(): string {
  if (process.versions.bun) {
    return path.join(path.dirname(process.execPath), '..', 'scripts');
  }
  return path.join(__dirname, '..', '..', '..', 'scripts');
}

function getRunScriptParams(workspacePath: string, packageName: string, suiteName: string, rounds: number | null, testIds?: Array<string>): Array<string> {
  const params = getBuildScriptParams(workspacePath, packageName, suiteName);
  if (rounds !== null) params.push('--round', String(rounds));
  if (testIds !== undefined && testIds.length > 0) params.push('--test-id', testIds.join(','));
  return params;
}

function getBuildScriptParams(workspacePath: string, packageName: string, suiteName: string): Array<string> {
  return ['--project-path', workspacePath, '--package', packageName, '--suite', suiteName];
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

async function* runScript(scriptPath: string, params: string[], signal: AbortSignal): AsyncGenerator<ScriptOutput> {
  if (signal.aborted) return;
  const scriptParams = params;
  const child = spawn(locateBash(), [scriptPath, ...scriptParams], { env: process.env, detached: process.platform !== 'win32' });
  const stopChild = () => {
    if (child.pid === undefined) return;
    try {
      if (process.platform === 'win32') child.kill();
      else process.kill(-child.pid, 'SIGTERM');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
    }
  };
  signal.addEventListener('abort', stopChild, { once: true });
  if (signal.aborted) stopChild();
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

  try {
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
          yield ({ child, rawOutput, parsed });
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
        yield ({ child, rawOutput: stdoutBuffer, parsed });
      } catch {
        console.error('JSON line parsing failed:\n', stdoutBuffer);
      }
    }

    const processState = await processStatePromise;

    if (processState.spawnError !== null) {
      const data: ScriptExecutionErrorData = {
        scriptPath,
        params: scriptParams,
        exitCode: null,
        stderr,
        stdout,
      };
      throw new ScriptExecutionError(data, `Unable to run script ${path.basename(scriptPath)}: ${processState.spawnError.message}`);
    }

    if (signal.aborted) return;

    if (processState.exitCode !== 0) {
      const data: ScriptExecutionErrorData = {
        scriptPath,
        params: scriptParams,
        exitCode: processState.exitCode,
        stderr,
        stdout,
      };
      throw new ScriptExecutionError(data, buildScriptExecutionMessage(data));
    }
  } finally {
    signal.removeEventListener('abort', stopChild);
  }
}

export async function* runBuildScript(mode: string, workspacePath: string, packageName: string, suiteName: string, signal: AbortSignal): AsyncGenerator<ScriptOutput> {
  const scriptPath = getBuildScriptPath(mode);
  const params = getBuildScriptParams(workspacePath, packageName, suiteName);
  for await (const output of runScript(scriptPath, params, signal)) yield output;
}

export async function* runRunScript(mode: string, workspacePath: string, packageName: string, suiteName: string, rounds: number | null, testIds: Array<string> | undefined, signal: AbortSignal): AsyncGenerator<ScriptOutput> {
  const scriptPath = getRunScriptPath(mode);
  const params = getRunScriptParams(workspacePath, packageName, suiteName, rounds, testIds);
  for await (const output of runScript(scriptPath, params, signal)) yield output;
}
