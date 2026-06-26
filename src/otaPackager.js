const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

function computeSha256(filePath) {
  const hash = crypto.createHash('sha256');
  const data = fs.readFileSync(filePath);
  hash.update(data);
  return hash.digest('hex');
}

function ensureTarAvailable() {
  const result = spawnSync('tar', ['--version'], { stdio: 'ignore' });
  if (result.error || result.status !== 0) {
    throw new Error('`tar` command is required for OTA packaging but was not found.');
  }
}

function packClientAssets(outputDir = path.join(__dirname, '..', 'output')) {
  const projectRoot = path.join(__dirname, '..');
  const kindleSource = path.join(projectRoot, 'clients', 'kindle');
  if (!fs.existsSync(kindleSource)) {
    throw new Error('clients/kindle directory does not exist. Please add Kindle client files under clients/kindle.');
  }

  const outputClientsDir = path.join(outputDir, 'clients');
  const outputKindleDir = path.join(outputClientsDir, 'kindle');
  fs.mkdirSync(outputKindleDir, { recursive: true });

  const archivePath = path.join(outputKindleDir, 'update.tar.gz');
  ensureTarAvailable();

  const tarBase = path.dirname(kindleSource);
  const tarName = path.basename(kindleSource);
  const result = spawnSync('tar', ['-czf', archivePath, '-C', tarBase, tarName], { stdio: 'inherit' });
  if (result.error || result.status !== 0) {
    throw new Error('Failed to create Kindle client update archive.');
  }

  const version = computeSha256(archivePath);
  const manifest = {
    version,
    platform: 'kindle',
    package: 'kindle/update.tar.gz',
    hash_algorithm: 'sha256',
    updated_at: new Date().toISOString()
  };

  fs.writeFileSync(path.join(outputClientsDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return { manifest, archivePath };
}

module.exports = {
  packClientAssets
};
