import { createContext, useContext } from 'react';

// Matches the default of VS Code's built-in `testing.coverageBarThresholds`,
// and is what the bars render with until the extension sends the real values.
export const DEFAULT_COVERAGE_BAR_THRESHOLDS: CoverageBarThresholds = { red: 0, yellow: 60, green: 90 };

export const CoverageBarThresholdsContext = createContext<CoverageBarThresholds>(DEFAULT_COVERAGE_BAR_THRESHOLDS);

export const useCoverageBarThresholds = (): CoverageBarThresholds => useContext(CoverageBarThresholdsContext);
