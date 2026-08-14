import type { Database, RoundDocument } from '../collections';

const mapRound = (round: TestRound): Partial<RoundDocument> => {
  const document: Partial<RoundDocument> = {
    id: round.testId.join(':') + ':' + round.id.toString(),
    workspaceId: round.testId[0],
    packageName: round.testId[1],
    suiteName: round.testId[2],
    testId: round.testId[3],
    roundId: round.id.toString(),
    status: round.status,
    type: round.type,
  };

  if (round.type === 'threat-model') {
    document.parentTestId = (round as ThreatModelTestRound).parentTestId[3];
    document.traces = (round as ThreatModelTestRound).traces;
  } else {
    document.threatModelTestIds = (round as TransitionTestRound).threatModelTestIds.map(id => id[3]);
    document.transitions = (round as TransitionTestRound).transitions.map(transition => ({
      action: transition.action,
      result: transition.result,
      stepIndex: transition.stepIndex,
      tx: transition.tx,
    }));
  }

  return document;
}

export const createRounds = async (database: Database, rounds: Array<TestRound>): Promise<void> => {
  await database.rounds.bulkUpsert(rounds.map(mapRound));
}

const mapDocument = (document: RoundDocument): TestRound => {
  const round: TestRound = {
    id: parseInt(document.roundId),
    testId: [document.workspaceId, document.packageName, document.suiteName, document.testId],
    type: document.type as 'positive' | 'negative' | 'threat-model' | undefined,
    status: document.status as TestRoundStatus,
  };

  if (document.type === 'threat-model') {
    (round as ThreatModelTestRound).parentTestId = [document.workspaceId, document.packageName, document.suiteName, document.parentTestId!];
    (round as ThreatModelTestRound).traces = document.traces! as Array<ThreatModelTrace>;
  } else {
    (round as TransitionTestRound).threatModelTestIds = (document.threatModelTestIds || []).map(id => [document.workspaceId, document.packageName, document.suiteName, id]);
    (round as TransitionTestRound).transitions = (document.transitions || []).map(transition => ({
      action: transition.action,
      result: transition.result as TestTransitionResult,
      stepIndex: transition.stepIndex,
      tx: transition.tx,
    }));
  }

  return round;
};

export const getTestRounds = async (database: Database, id: TestId): Promise<Array<TestRound>> => {
  const [workspaceId, packageName, suiteName, testId] = id;
  const roundDocuments: Array<RoundDocument> = await database.rounds.find({
    selector: {
      workspaceId, packageName, suiteName, testId
    }
  }).exec();
  return roundDocuments.map(mapDocument);
}
