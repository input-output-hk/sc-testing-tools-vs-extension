export interface TabItem {
  id: string;
  label: string;
  panel: React.ReactNode;
}

interface Props {
  tabs: Array<TabItem>;
  selectedId: string;
  onSelect: (id: string) => void;
  className?: string;
  panelClassName?: string;
}

const Tabs: React.FC<Props> = ({ tabs, selectedId, onSelect, className, panelClassName }) => (
  <div className={className}>
    <div className="flex gap-6" role="tablist">
      {tabs.map(tab => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={tab.id === selectedId}
          onClick={() => onSelect(tab.id)}
          className={`pb-2 text-[13px] font-medium border-b-2 ${
            tab.id === selectedId
              ? 'text-vscode-panel-tab-active-fg border-vscode-panel-tab-active-border'
              : 'text-vscode-panel-tab-inactive-fg border-transparent'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
    {tabs.map(tab => (
      <div key={tab.id} className={panelClassName} role="tabpanel" hidden={tab.id !== selectedId}>
        {tab.panel}
      </div>
    ))}
  </div>
);

export default Tabs;
