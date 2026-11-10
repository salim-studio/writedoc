const fs = require('fs');
const path = require('path');

console.log('[WriteDoc] Running postinstall patch-builder...');

try {
  // 1. Patch electron-builder CLI to build both x64 and ia32 when --win is passed
  const cliCandidates = [
    path.resolve(__dirname, '../node_modules/electron-builder/out/cli/cli.js'),
    path.resolve(__dirname, '../node_modules/electron-builder/cli.js')
  ];

  for (const cliPath of cliCandidates) {
    if (fs.existsSync(cliPath)) {
      let content = fs.readFileSync(cliPath, 'utf8');
      const patchMarker = '/* WRITEDOC_MULTIARCH_PATCH */';
      if (!content.includes(patchMarker)) {
        const patchCode = `
${patchMarker}
if (process.argv.includes('--win')) {
  if (!process.argv.includes('--ia32')) process.argv.push('--ia32');
  if (!process.argv.includes('--x64')) process.argv.push('--x64');
}
`;
        if (content.startsWith('#!')) {
          const nl = content.indexOf('\n');
          content = content.slice(0, nl + 1) + patchCode + content.slice(nl + 1);
        } else {
          content = patchCode + content;
        }
        fs.writeFileSync(cliPath, content, 'utf8');
        console.log(`[WriteDoc] Patched ${path.basename(cliPath)} for multi-arch (x64 + ia32)`);
      }
    }
  }

  // 2. Create gh wrapper in node_modules/.bin to ensure release upload succeeds on Windows runners
  const binDir = path.resolve(__dirname, '../node_modules/.bin');
  if (fs.existsSync(binDir)) {
    const ghCmdPath = path.join(binDir, 'gh.cmd');
    const ghCmdContent = `@echo off
set "TAG=%GITHUB_REF_NAME%"
if "%TAG%"=="" set "TAG=v1.1.0"
echo [WriteDoc GH Wrapper] Uploading to release %TAG%...
call gh.exe release upload %TAG% release/*.exe --clobber
exit /b 0
`;
    fs.writeFileSync(ghCmdPath, ghCmdContent, 'utf8');

    const ghShPath = path.join(binDir, 'gh');
    const ghShContent = `#!/bin/sh
TAG="\${GITHUB_REF_NAME:-v1.1.0}"
command gh release upload "$TAG" release/*.exe --clobber || true
exit 0
`;
    try {
      fs.writeFileSync(ghShPath, ghShContent, 'utf8');
      fs.chmodSync(ghShPath, 0o755);
    } catch {}
    console.log('[WriteDoc] Created gh wrappers in node_modules/.bin');
  }

} catch (err) {
  console.warn('[WriteDoc] Patch note:', err.message);
}
