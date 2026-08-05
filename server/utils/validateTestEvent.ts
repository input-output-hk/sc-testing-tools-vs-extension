import Ajv, { ValidateFunction } from 'ajv';

import { SCToolsStreamingEvent } from '../schemas/streaming-events';
import streamingEventSchema from '../schemas/streaming-events.schema.json';

const ajv: Ajv = new Ajv({ strictSchema: false });
ajv.addFormat("double", true);

const validateTestEvent: ValidateFunction<SCToolsStreamingEvent> = ajv.compile<SCToolsStreamingEvent>(streamingEventSchema);

const getValidationError = (): string => {
  return ajv.errorsText(validateTestEvent.errors);
}

export { validateTestEvent, getValidationError };