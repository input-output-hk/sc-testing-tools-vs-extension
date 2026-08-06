export const WORKSPACE_ID_MAX_LENGTH = 8;
export const PACKAGE_NAME_MAX_LENGTH = 256;
export const SUITE_NAME_MAX_LENGTH = 256;
export const TEST_ID_MAX_LENGTH = 10;
export const TEST_ROUND_MAX_LENGTH = 4;

// workspaceId:packageName
export const PACKAGE_ID_MAX_LENGTH = WORKSPACE_ID_MAX_LENGTH + 1 + PACKAGE_NAME_MAX_LENGTH;

// workspaceId:packageName:suiteName
export const SUITE_ID_MAX_LENGTH = PACKAGE_ID_MAX_LENGTH + 1 + SUITE_NAME_MAX_LENGTH;

// workspaceId:packageName:suiteName:testId
export const FULL_TEST_ID_MAX_LENGTH = SUITE_ID_MAX_LENGTH + 1 + TEST_ID_MAX_LENGTH; 

// workspaceId:packageName:suiteName:testId:round
export const TEST_ROUND_ID_MAX_LENGTH = FULL_TEST_ID_MAX_LENGTH + 1 + TEST_ROUND_MAX_LENGTH;
