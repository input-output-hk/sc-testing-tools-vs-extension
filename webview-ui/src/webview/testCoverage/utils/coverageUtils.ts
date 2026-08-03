export const getFileName = (uri: string): string => {
  const decoded = decodeURIComponent(uri);
  const segments = decoded.split(/[\\/]/).filter(Boolean);
  return segments[segments.length - 1] ?? decoded;
};
