import type { Database, PackageDocument, SuiteDocument, TestDocument } from '../collections';

export const handleTestRunStop = async (database: Database): Promise<void> => {
  database.suites.find().update({ $set: { isWaiting: false, isRunning: false } });
  database.tests.find().update({ $set: { isWaiting: false, isRunning: false } });
};