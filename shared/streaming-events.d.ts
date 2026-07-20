/**
 * A single NDJSON line from the sc-tools test streaming reporter
 */
export type SCToolsStreamingEvent =
  | {
      coverageIndex: SrcLocRanges[];
      event: "suite_started";
      packageRoot?: string;
      tests: TestInfo[];
      [k: string]: unknown;
    }
  | {
      event: "test_started";
      id: number;
      [k: string]: unknown;
    }
  | {
      event: "test_progress";
      id: number;
      message: string;
      percent: number;
      [k: string]: unknown;
    }
  | {
      description: string;
      duration: number;
      event: "test_done";
      failure?: FailureInfo;
      id: number;
      monitoring_stats?: MonitoringStats;
      success: boolean;
      threat_model?: ThreatModelSummary;
      [k: string]: unknown;
    }
  | {
      category: string;
      covered: SrcLocRanges[];
      event: "test_trace";
      id: number;
      trace: IterationTrace;
      [k: string]: unknown;
    }
  | {
      duration: number;
      event: "suite_done";
      failed: number;
      passed: number;
      [k: string]: unknown;
    };
export type IterationStatus =
  | {
      status: "success";
      [k: string]: unknown;
    }
  | {
      message: string;
      status: "failure";
      [k: string]: unknown;
    }
  | {
      message: string;
      status: "discarded";
      [k: string]: unknown;
    };
export type TxMod =
  | {
      type: "removeInput";
      utxo: string;
      [k: string]: unknown;
    }
  | {
      index: number;
      type: "removeOutput";
      [k: string]: unknown;
    }
  | {
      address: string;
      datum: string;
      index: number;
      referenceScript: string;
      type: "changeOutput";
      value: ValueSummary;
      [k: string]: unknown;
    }
  | {
      address: string;
      datum: string;
      referenceScript: string;
      type: "changeInput";
      utxo: string;
      value: ValueSummary;
      [k: string]: unknown;
    }
  | {
      datum: string;
      redeemer: string;
      referenceScript: string;
      type: "changeScriptInput";
      utxo: string;
      value: ValueSummary;
      [k: string]: unknown;
    }
  | {
      lowerBound: string;
      type: "changeValidityRange";
      upperBound: string;
      [k: string]: unknown;
    }
  | {
      address: string;
      datum: string;
      referenceScript: string;
      type: "addOutput";
      value: ValueSummary;
      [k: string]: unknown;
    }
  | {
      address: string;
      datum: string;
      isReferenceInput: boolean;
      referenceScript: string;
      type: "addInput";
      value: ValueSummary;
      [k: string]: unknown;
    }
  | {
      datum: string;
      redeemer: string;
      scriptHash: string;
      type: "addReferenceScriptInput";
      value: ValueSummary;
      [k: string]: unknown;
    }
  | {
      datum: string;
      redeemer: string;
      referenceScript: string;
      type: "addPlutusScriptInput";
      value: ValueSummary;
      [k: string]: unknown;
    }
  | {
      datum: string;
      referenceScript: string;
      type: "addPlutusScriptReferenceInput";
      value: ValueSummary;
      [k: string]: unknown;
    }
  | {
      isReferenceInput: boolean;
      referenceScript: string;
      type: "addSimpleScriptInput";
      value: ValueSummary;
      [k: string]: unknown;
    }
  | {
      assetName: string;
      quantity: number;
      redeemer: string;
      type: "addPlutusScriptMint";
      [k: string]: unknown;
    }
  | {
      keyHash: string;
      type: "removeRequiredSigner";
      [k: string]: unknown;
    }
  | {
      type: "replaceTx";
      [k: string]: unknown;
    };
export type ThreatModelTraceOutcome =
  | {
      status: "passed";
      [k: string]: unknown;
    }
  | {
      reason: string;
      status: "failed";
      [k: string]: unknown;
    }
  | {
      reason: string;
      status: "skipped";
      [k: string]: unknown;
    }
  | {
      message: string;
      status: "error";
      [k: string]: unknown;
    };
export type TransitionResult =
  | {
      status: "success";
      txId: string;
      [k: string]: unknown;
    }
  | {
      error: string;
      status: "failure";
      [k: string]: unknown;
    };

export interface SrcLocRanges {
  endCols: number[];
  endLines: number[];
  file: string;
  startCols: number[];
  startLines: number[];
  [k: string]: unknown;
}
export interface TestInfo {
  id: number;
  name: string;
  path: string[];
  srcLoc?: {
    endCol: number;
    endLine: number;
    file: string;
    startCol: number;
    startLine: number;
    [k: string]: unknown;
  };
  [k: string]: unknown;
}
export interface FailureInfo {
  message: string;
  reason: string;
  [k: string]: unknown;
}
export interface MonitoringStats {
  classes: MonitoringClassStat[];
  labels: MonitoringLabelStat[];
  numDiscarded: number;
  numTests: number;
  tables: MonitoringTableStat[];
  [k: string]: unknown;
}
export interface MonitoringClassStat {
  count: number;
  name: string;
  percent: number;
  [k: string]: unknown;
}
export interface MonitoringLabelStat {
  count: number;
  labels: string[];
  percent: number;
  [k: string]: unknown;
}
export interface MonitoringTableStat {
  entries: MonitoringTableEntry[];
  name: string;
  [k: string]: unknown;
}
export interface MonitoringTableEntry {
  count: number;
  value: string;
  [k: string]: unknown;
}
export interface ThreatModelSummary {
  errors: number;
  failed: number;
  name: string;
  passed: number;
  skipped: number;
  tested: number;
  total: number;
  [k: string]: unknown;
}
export interface IterationTrace {
  index: number;
  status: IterationStatus;
  threatModels: ThreatModelTrace[];
  transitions: Transition[];
  [k: string]: unknown;
}
export interface ThreatModelTrace {
  covered: SrcLocRanges[];
  modifications: TxMod[];
  modifiedTx: TxSummary;
  name: string;
  originalTx: TxSummary;
  outcome: ThreatModelTraceOutcome;
  targetTxIndex: number;
  testId: number;
  [k: string]: unknown;
}
export interface ValueSummary {
  assets: AssetSummary[];
  lovelace: number;
  [k: string]: unknown;
}
export interface AssetSummary {
  name: string;
  policyId: string;
  quantity: number;
  [k: string]: unknown;
}
export interface TxSummary {
  fee: number;
  id: string;
  inputs: TxInputSummary[];
  mint: ValueSummary;
  outputs: TxOutputSummary[];
  signers: string[];
  validRange: string;
  [k: string]: unknown;
}
export interface TxInputSummary {
  address: string;
  utxo: string;
  value: ValueSummary;
  [k: string]: unknown;
}
export interface TxOutputSummary {
  address: string;
  datum: string;
  utxo: string;
  value: ValueSummary;
  [k: string]: unknown;
}
export interface Transition {
  action: string;
  result: TransitionResult;
  stateAfter: unknown;
  stateBefore: unknown;
  stepIndex: number;
  transaction: TxSummary;
  [k: string]: unknown;
}