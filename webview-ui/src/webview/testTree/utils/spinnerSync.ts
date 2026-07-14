const SPIN_DURATION_MS = 1000;

const registry = new Set<HTMLElement>();
let rafId: number | null = null;

const tick = () => {
  const angleDeg = ((Date.now() % SPIN_DURATION_MS) / SPIN_DURATION_MS) * 360;
  for (const el of registry) {
    el.style.transform = `rotate(${angleDeg}deg)`;
  }
  rafId = requestAnimationFrame(tick);
};

/**
 * Registers an element to have its rotation driven by a single shared wall-clock loop,
 * so elements stay in sync even after being hidden (e.g. inside a collapsed tree folder)
 * and shown again, unlike a CSS animation which pauses while `display: none`.
 */
export const registerSpinner = (el: HTMLElement): (() => void) => {
  registry.add(el);
  if (rafId === null) {
    rafId = requestAnimationFrame(tick);
  }
  return () => {
    registry.delete(el);
    if (registry.size === 0 && rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };
};
