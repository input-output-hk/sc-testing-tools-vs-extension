import { useCallback, useRef } from 'react';

import { registerSpinner } from '../../utils/spinnerSync';

const useSyncedSpin = (): ((el: HTMLElement | null) => void) => {
  const cleanupRef = useRef<(() => void) | null>(null);

  return useCallback((el: HTMLElement | null) => {
    cleanupRef.current?.();
    cleanupRef.current = el ? registerSpinner(el) : null;
  }, []);
};

export default useSyncedSpin;
