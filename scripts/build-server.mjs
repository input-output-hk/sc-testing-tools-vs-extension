const supportedTargets = {
  'darwin-arm64': 'bun-darwin-arm64',
  'darwin-x64': 'bun-darwin-x64',
  'linux-arm64': 'bun-linux-arm64',
  'linux-x64': 'bun-linux-x64',
  'win32-arm64': 'bun-windows-arm64',
  'win32-x64': 'bun-windows-x64',
};

const platforms = process.argv[2]
  ? [process.argv[2]]
  : Object.keys(supportedTargets);

for (const platform of platforms) {
  const target = supportedTargets[platform];
  if (!target) {
    throw new Error(`Unsupported PBT server platform: ${platform}`);
  }

  const output = `bin/pbt-server-${platform}${platform.startsWith('win32-') ? '.exe' : ''}`;
  const result = await Bun.build({
    entrypoints: ['server/index.ts'],
    compile: { target, outfile: output, autoloadDotenv: false, autoloadBunfig: false },
  });

  if (!result.success) {
    for (const message of result.logs) console.error(message);
    process.exitCode = 1;
  } else {
    console.log(`Built ${output}`);
  }
}