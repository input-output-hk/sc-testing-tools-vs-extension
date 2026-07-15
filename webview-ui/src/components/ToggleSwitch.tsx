import { VscodeBadge } from '@vscode-elements/react-elements';

interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  badgeCount?: number;
}

const ToggleSwitch: React.FC<Props> = ({
  checked,
  onChange,
  label,
  badgeCount,
}) => (
  <label className="inline-flex items-center gap-1.5 cursor-pointer text-[13px] text-base-06 select-none">
    <span className="text-[13px] text-base-07">{label}</span>
    {badgeCount !== undefined && (
      <VscodeBadge variant="counter">{badgeCount}</VscodeBadge>
    )}
    <span
      onClick={() => onChange(!checked)}
      className={`relative inline-block w-6.5 h-3.5 rounded-full shrink-0 transition-colors duration-150 ${checked ? 'bg-blue-06' : 'bg-base-13'}`}
    >
      <span
        className={`absolute top-px w-3 h-3 rounded-full bg-base-01 transition-all duration-150 ${checked ? 'left-3.25' : 'left-px'}`}
      />
    </span>
  </label>
);

export default ToggleSwitch;
