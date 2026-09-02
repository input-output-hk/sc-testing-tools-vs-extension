import * as rpc from 'vscode-jsonrpc/node';
import { createHash } from 'node:crypto';
import { queue } from 'async';

import { prefetch } from './services/prefetch';
import { handleJob } from './services/handler';

import type { QueueObject } from 'async';

class RpcServer {
  private requestQueue: QueueObject<RpcJob>;
  private connection: rpc.MessageConnection;

  constructor() {
    this.requestQueue = queue<RpcJob>(this.handleJob.bind(this), 1);
    this.connection = rpc.createMessageConnection(
      new rpc.StreamMessageReader(process.stdin),
      new rpc.StreamMessageWriter(process.stdout)
    );
    this.setupHandlers();
    this.connection.listen();
  }

  private setupHandlers(): void {
    this.setupPrefecthHandler();
    this.setupTestSuiteBuildHandler();
    this.setupTestRunHandler();
  }

  private setupPrefecthHandler(): void {
    this.connection.onRequest(
      new rpc.RequestType<PrefetchParams, TestTree, void>('prefetch'),
      async (params: PrefetchParams): Promise<TestTree> => {
        try {
          return await prefetch(params.workspaces);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          throw new rpc.ResponseError(rpc.ErrorCodes.InternalError, `Unable to prefetch test tree: ${message}`);
        }
      }
    );
  }

  private setupTestSuiteBuildHandler(): void {
    this.connection.onNotification(
      new rpc.NotificationType<TestSuiteBuildParams>('testSuiteBuild'),
      (params: TestSuiteBuildParams) => this.createJob('build', params)
    );
  }

  private setupTestRunHandler(): void {
    this.connection.onNotification(
      new rpc.NotificationType<TestRunParams>('testRun'),
      (params: TestRunParams) => this.createJob('run', params)
    );
  }

  private makeJobId(): string {
    return createHash('sha256').digest('hex');
  }

  private async createJob(type: RpcJobType, params: TestSuiteBuildParams | TestRunParams): Promise<void> {
    await this.requestQueue.push({
      id: this.makeJobId(),
      type,
      params,
      status: 'running',
      progress: 0,
      startedOn: Date.now(),
    });
  }

  private async handleJob(job: RpcJob): Promise<void> {
    await handleJob(this.connection, job);
  }
}

const init = () => {
  const server = new RpcServer();
};

init();
