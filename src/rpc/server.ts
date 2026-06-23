import { runBuildTestTreeScript, BuildTestTreeExecutionError } from '../services/buildTestTree';
import { JsonRpcRequest, JsonRpcResponse } from './types';

export interface JsonRpcContext {
  extensionPath: string;
}

export async function handleJsonRpcRequest(
  request: JsonRpcRequest,
  context: JsonRpcContext,
): Promise<JsonRpcResponse> {
  const id = request.id ?? null;

  if (request.jsonrpc !== '2.0' || typeof request.method !== 'string') {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32600,
        message: 'Invalid Request',
      },
    };
  }

  if (request.method === 'build-test-tree') {
    try {
      let result;
      let output = "";
      for await (result of runBuildTestTreeScript(context.extensionPath, 'scripts/list-tests-json.sh')) {
        if (result.parsed) break;
        output += result.rawOutput + "\n";
      }
      if (!result?.parsed) {
        throw new BuildTestTreeExecutionError("No JSON retrieved", null!);
      }
      return {
        jsonrpc: '2.0',
        id,
        result,
        output
      };
    } catch (error) {
      if (error instanceof BuildTestTreeExecutionError) {
        return {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32603,
            message: 'build-test-tree execution failed',
            data: error.data,
          },
        };
      }

      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: 'Internal error',
          data: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  return {
    jsonrpc: '2.0',
    id,
    error: {
      code: -32601,
      message: 'Method not found',
      data: { method: request.method },
    },
  };
}
