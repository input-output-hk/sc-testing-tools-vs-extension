import { VscodeTreeItem } from '@vscode-elements/react-elements';

interface Props {
  label: string;
  children: React.ReactNode;
}

const CoverageTreeFolder: React.FC<Props> = ({ label, children }) => (
  <VscodeTreeItem open>
    <span className="flex-1 min-w-0 overflow-hidden whitespace-nowrap text-ellipsis">
      {label}
    </span>
    {children}
  </VscodeTreeItem>
);

export default CoverageTreeFolder;
