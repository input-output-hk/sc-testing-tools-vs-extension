import { VscodeScrollable } from '@vscode-elements/react-elements';

interface Props {
  testResult: TestResult;
}

const SectionHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-base-09 mb-1.5 pb-1 border-b border-base-13">
    {children}
  </div>
);

const MetaGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="grid grid-cols-3 gap-x-3 gap-y-1.5">
    {children}
  </div>
);

const MetaCell: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="min-w-0">
    <div className="text-[11px] text-base-09 mb-0.5">{label}</div>
    <div className="text-[12px] truncate">{value}</div>
  </div>
);

const TestPropertiesTab: React.FC<Props> = ({ testResult }) => (
  <VscodeScrollable>
    <div className="px-4 py-3 flex flex-col gap-4">
      <section>
        <SectionHeading>Solver Metadata</SectionHeading>
        <MetaGrid>
          <MetaCell label="Solver Used" value="—" />
          <MetaCell label="Solver Version" value="—" />
          <MetaCell label="Solver Flags" value="—" />
        </MetaGrid>
      </section>

      <section>
        <SectionHeading>Statistics</SectionHeading>
        <MetaGrid>
          <MetaCell label="Status" value={testResult.test.status} />
          <MetaCell
            label="Time to Execute"
            value={testResult.test.time != null ? `${testResult.test.time}ms` : "—"}
          />
          <MetaCell label="Number of Clauses" value="—" />
          <MetaCell
            label="Number of Steps"
            value={testResult.counterexampleSteps && testResult.counterexampleSteps.length > 0 ? String(testResult.counterexampleSteps.length) : "—"}
          />
          <MetaCell label="Number of Literals" value="—" />
        </MetaGrid>
      </section>
    </div>
  </VscodeScrollable>
);

export default TestPropertiesTab;
