export function getBinaryPath(): string {
  return `bin/pbt-server-${process.platform}-${process.arch}`;
}