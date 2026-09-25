import Tooltip from '../../../components/Tooltip';

interface Props {
  scope: CoverageScope;
  hasItems: boolean;
  onClearFullCoverage: () => void;
}

interface TestScopePathProps {
  scope: Extract<CoverageScope, { type: 'test' }>;
}

const PATH_ANCHOR_ID = 'coverage-title-path';

const CoverageTitle: React.FC<Props> = ({ scope, hasItems, onClearFullCoverage }) => (
  <div className="flex h-[33px] w-full shrink-0 items-center justify-center px-3 py-1">
    <div className="flex h-full w-full items-center gap-1 rounded bg-[var(--vscode-modernTab-activeBackground)] px-2 py-0.5">
      {hasItems && <i className="codicon codicon-coverage text-[var(--vscode-editor-foreground)]" />}
      <span className="flex min-w-0 flex-1 items-center whitespace-nowrap text-[11px] font-medium">
        {!hasItems &&
          <span className="text-[var(--vscode-editor-foreground)]">No coverage detected</span>
        }
        {hasItems && scope.type === 'all' &&
          <span className="text-[var(--vscode-editor-foreground)]">Coverage: Entire Test Run</span>
        }
        {hasItems && scope.type === 'test' &&
          <TestScopePath scope={scope} />
        }
      </span>
      {scope.type === 'test' &&
        <button
          type="button"
          className="flex h-4 w-4 shrink-0 items-center justify-center border-0 bg-transparent p-0 opacity-60 hover:opacity-100 cursor-pointer"
          onClickCapture={onClearFullCoverage}
          data-tooltip-id="coverage-title-action"
          data-tooltip-content="Clear Coverage"
        >
          <i className="codicon codicon-close text-[var(--vscode-editor-foreground)]" />
        </button>
      }
    </div>
    <Tooltip id="coverage-title-action" place="bottom" />
  </div>
);

// The leading breadcrumb shrinks and ellipsises, while the test name itself
// always stays readable. Hovering the breadcrumb reveals the untruncated path.
const TestScopePath: React.FC<TestScopePathProps> = ({ scope }) => {
  const [, packageName, suiteName] = scope.testId;
  const segments = [packageName, suiteName, ...scope.group];

  return (
    <>
      <span className="flex-none text-[var(--vscode-editor-foreground)]">Coverage:&nbsp;</span>
      <span
        id={PATH_ANCHOR_ID}
        className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[var(--vscode-descriptionForeground)]"
      >
        {segments.map((segment, index) =>
          <span key={`${index}-${segment}`}>
            <span>{segment}</span>
            <i className="codicon codicon-chevron-right mx-0.5 translate-y-0.5" style={{ fontSize: '11px' }} />
          </span>
        )}
      </span>
      <span className="flex-none text-[var(--vscode-editor-foreground)]">{scope.testName}</span>
      <Tooltip
        content={[...segments, scope.testName].join(' / ')}
        id={PATH_ANCHOR_ID}
        maxWidth="300px"
        place="bottom-start"
      />
    </>
  );
};

export default CoverageTitle;
