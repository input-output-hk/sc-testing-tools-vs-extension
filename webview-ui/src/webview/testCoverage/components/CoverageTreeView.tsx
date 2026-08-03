import { VscodeTree } from '@vscode-elements/react-elements';

import CoverageTreeFile from './CoverageTreeFile';

interface Props {
  files: Array<CoverageFileSummary>;
}

const CoverageTreeView: React.FC<Props> = ({ files }) => (
  <div className="h-full flex flex-col">
    <div className="flex-1 overflow-y-auto">
      <VscodeTree>
        {files.map((file) => (
          <CoverageTreeFile key={file.uri} file={file} />
        ))}
      </VscodeTree>
    </div>
  </div>
);

export default CoverageTreeView;
