import { runRunScript } from '../../utils/runScript';
import { SCToolsStreamingEvent } from '../../../shared/streaming-events';
import streamingEventSchema from "./streaming-events.schema.json";
import Ajv from "ajv";

const ajv = new Ajv();
ajv.addFormat("double", true);
const validate = ajv.compile<SCToolsStreamingEvent>(streamingEventSchema);

async function* runTests(params: RunTestsParams): AsyncGenerator<TestResult> {
  for await (const result of runRunScript(params.mode, params.workspacePath, params.packageName, params.suiteName, params.testIds)) {
    const testEvent = result.parsed
    if (validate(testEvent)) {
      yield {
        id: `${params.packageName}:${params.suiteName}:${testEvent.id}`,
        event: testEvent,
        error: undefined
      };
    } else {
      yield {
        rawEvent: testEvent,
        error: ajv.errorsText(validate.errors)
      }
    }
  }
};

export default runTests;