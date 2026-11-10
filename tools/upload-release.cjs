const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * electron-builder afterAllArtifactBuild hook
 * Automatically uploads all built Windows (.exe) artifacts to the current release
 */
module.exports = async function(context) {
  console.log('[WriteDoc] afterAllArtifactBuild hook running...');
  const artifacts = context.artifactPaths || [];
  console.log('[WriteDoc] Artifacts created:', artifacts);

  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  let tag = process.env.GITHUB_REF_NAME || 'v1.1.0';
  if (!tag || tag === 'main' || tag === 'master') tag = 'v1.1.0';

  console.log(`[WriteDoc] Target release tag: ${tag}`);

  // Upload each .exe file to the release
  const exeFiles = artifacts.filter(f => f.endsWith('.exe'));
  for (const exe of exeFiles) {
    const filename = path.basename(exe);
    console.log(`[WriteDoc] Uploading ${filename} to release ${tag}...`);
    try {
      execSync(`gh release upload "${tag}" "${exe}" --clobber`, {
        stdio: 'inherit',
        env: { ...process.env, GH_TOKEN: token }
      });
      console.log(`[WriteDoc] Successfully uploaded: ${filename}`);
    } catch (err) {
      console.warn(`[WriteDoc] gh upload note for ${filename}:`, err.message);
    }
  }

  return artifacts;
};
