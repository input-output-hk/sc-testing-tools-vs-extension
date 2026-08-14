import { useEffect, useRef, useState } from 'react';

const useCollapseOnSignal = (collapseSignal: number): [boolean, (isOpen: boolean) => void] => {
  const [isOpen, setIsOpen] = useState(true);
  const prevSignal = useRef(collapseSignal);

  useEffect(() => {
    if (collapseSignal !== prevSignal.current) {
      prevSignal.current = collapseSignal;
      setIsOpen(false);
    }
  }, [collapseSignal]);

  return [isOpen, setIsOpen];
};

export default useCollapseOnSignal;
