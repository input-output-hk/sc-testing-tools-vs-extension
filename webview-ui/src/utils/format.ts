
export const formatRunTime = (time: number): string => {
  if (time < 1000) {
    return `${Math.floor(time)}ms`;
  } else if (time < 1000 * 60) {
    return `${(time / 1000).toFixed(1)}s`;
  } else {
    return `${(time / 1000 / 60).toFixed(2)}m`;
  }
};