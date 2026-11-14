
export const formatRunTime = (time: number): string => {
  if (time < 1000) {
    return `${Math.floor(time)}ms`;
  } else if (time < 1000 * 60) {
    return `${(time / 1000).toFixed(1)}s`;
  } else {
    return `${(time / 1000 / 60).toFixed(2)}m`;
  }
};
const padTwo = (value: number): string => value.toString().padStart(2, '0');

export const formatRunDate = (date: Date): string => {
  return `${padTwo(date.getMonth() + 1)}/${padTwo(date.getDate())}/${date.getFullYear()}, ${padTwo(date.getHours())}:${padTwo(date.getMinutes())}:${padTwo(date.getSeconds())}`;
};
