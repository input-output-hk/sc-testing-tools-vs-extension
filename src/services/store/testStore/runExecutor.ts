import { PreparedRunRequest } from './runCoordinator';

export interface RunExecutorContext {
  getExecutionMode: () => ExtensionMode | undefined;
  logError: (message: string) => void;
  runTests: (runRequest: PreparedRunRequest, mode: ExtensionMode) => void;
}

export default class RunExecutor {
  constructor(private readonly context: RunExecutorContext) {}

  public dispatch(runRequest: PreparedRunRequest): void {
    const mode = this.context.getExecutionMode();
    
    if (!mode) {
      const errorMessage = 'Execution mode is not set';
      this.context.logError(errorMessage);
      throw new Error(errorMessage);
    }

    this.context.runTests(runRequest, mode);
  }
}