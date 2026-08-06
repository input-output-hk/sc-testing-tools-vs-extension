import type { Database, RoundDocument } from '../collections';

export const createRounds = async (database: Database, id: TestId, round: TestRound): Promise<void> => {
  const [workspaceId, packageName, suiteName, testId] = id;
  await database.rounds.upsert({
    id: `${workspaceId}:${packageName}:${suiteName}:${testId}:${round.id}`,
    workspaceId,
    packageName,
    suiteName,
    testId,
    roundId: round.id.toString(),
    status: round.status,
    transitions: round.transitions.map(transition => ({
      action: transition.action,
      result: transition.result,
      stepIndex: transition.stepIndex,
      tx: transition.tx,
    }))
  });
}

export const getTestRounds = async (database: Database, id: TestId): Promise<Array<TestRound>> => {
  const [workspaceId, packageName, suiteName, testId] = id;
  const roundDocuments: Array<RoundDocument> = await database.rounds.find({
    selector: {
      workspaceId, packageName, suiteName, testId
    }
  }).exec();

  return roundDocuments.map(roundDocument => ({
    id: parseInt(roundDocument.roundId),
    status: roundDocument.status as TestRoundStatus,
    transitions: roundDocument.transitions.map(transition => ({
      action: transition.action,
      result: transition.result as TestTransitionResult,
      stepIndex: transition.stepIndex,
      tx: transition.tx,
    }))
  }));
}
