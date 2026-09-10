import * as rpc from 'vscode-jsonrpc/node';
import { createHash } from 'node:crypto';
import { queue } from 'async';

import { prefetch } from './services/prefetch';
import { handleJob } from './services/handler';

import type { QueueObject } from 'async';

export default class RpcServer {
  private requestQueue: QueueObject<TestJob>;
  private connection: rpc.MessageConnection;
  private stopSignal: boolean = false;

  constructor() {
    this.requestQueue = queue<TestJob>(this.handleJob.bind(this), 1);
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
    this.setupStopHandler();
  }

  private setupPrefecthHandler(): void {
    this.connection.onRequest(
      new rpc.RequestType<PrefetchParams, StaticTestTree, void>('prefetch'),
      async (params: PrefetchParams): Promise<StaticTestTree> => {
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

  private setupStopHandler(): void {
    this.connection.onNotification(
      new rpc.NotificationType<void>('stop'),
      () => {
        this.requestQueue.drain().then(() => this.stopSignal = false);
        this.requestQueue.remove(() => true);
        this.stopSignal = true;
      }
    );
  }

  private makeJobId(): string {
    return createHash('sha256').update(Date.now().toString()).digest('hex');
  }

  private async createJob(type: TestJobType, params: TestSuiteBuildParams | TestRunParams): Promise<void> {
    await this.requestQueue.push({
      id: this.makeJobId(),
      type,
      params,
      status: 'waiting',
    });
  }

  private async handleJob(job: TestJob): Promise<void> {
    await handleJob(this, job);
  }

  public getConnection(): rpc.MessageConnection {
    return this.connection;
  }

  public getStopSignal(): boolean {
    return this.stopSignal;
  }

  public getQueueCount(): number {
    return this.requestQueue.length();
  }
}

const init = () => {
  const server = new RpcServer();
};

init();
