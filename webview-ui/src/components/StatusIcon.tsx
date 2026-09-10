import useSyncedSpin from '../hooks/useSyncedSpin';

interface Props {
  animated?: boolean;
  className: string;
}

interface InternalProps {
  ref?: (el: HTMLElement | null) => void;
  className: string;
}

const SimpleStatusIcon: React.FC<InternalProps> = ({ ref, className }) => (
  <i ref={ref} className={`mr-0.5 codicon ${className}`} />
);

const SpinningStatusIcon: React.FC<Props> = ({ className }) => {
  const spinRef = useSyncedSpin();
  return <SimpleStatusIcon ref={spinRef} className={className} />;
};

const StatusIcon: React.FC<Props> = ({ animated, className }) => (
  animated === true ?
    <SpinningStatusIcon className={className} /> :
    <SimpleStatusIcon className={className} />
);

export default StatusIcon;