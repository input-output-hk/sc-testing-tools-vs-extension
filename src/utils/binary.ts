export function getBinaryPath(): string {
  return `bin/pbt-server-${process.platform}-${process.arch}${process.platform === 'win32' ? '.exe' : ''}`;
}