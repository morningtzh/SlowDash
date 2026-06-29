const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { buildPublicUrl } = require('./storage/s3Client');

function computeSha256(filePath) {
  try {
    const hash = crypto.createHash('sha256');
    const data = fs.readFileSync(filePath);
    hash.update(data);
    return hash.digest('hex');
  } catch (err) {
    console.error('[OTA] Failed to compute SHA256:', err.message);
    return '0000000000000000000000000000000000000000';
  }
}

function ensureTarAvailable() {
  const result = spawnSync('tar', ['--version'], { stdio: 'ignore' });
  if (result.error || result.status !== 0) {
    throw new Error('`tar` command is required for OTA packaging but was not found.');
  }
}

/**
 * Remove files from the staged directory that must never be shipped in OTA
 * packages (user config, dev-only files, etc.).
 */
function cleanStagedDir(stagedDir) {
  const toRemove = [
    'config.local.sh',       // user config — must never be overwritten
    'config.local.sh.example' // not needed on-device after initial install
  ];
  for (const name of toRemove) {
    const p = path.join(stagedDir, name);
    if (fs.existsSync(p)) fs.rmSync(p, { force: true });
  }
}

/**
 * Inject publicBaseUrl into config.sh by uncommenting / setting SLOWDASH_PUBLIC_URL.
 * Works with the new bin/config.sh format.
 */
function patchConfigWithPublicUrl(configPath, publicBaseUrl) {
  if (!publicBaseUrl || !fs.existsSync(configPath)) return;

  let content = fs.readFileSync(configPath, 'utf8');

  // Try to replace an existing (possibly commented) SLOWDASH_PUBLIC_URL line
  if (content.match(/^#?\s*SLOWDASH_PUBLIC_URL=/m)) {
    content = content.replace(
      /^#?\s*SLOWDASH_PUBLIC_URL=.*$/m,
      `SLOWDASH_PUBLIC_URL="${publicBaseUrl}"`
    );
  } else {
    // Append if not present
    content += `\nSLOWDASH_PUBLIC_URL="${publicBaseUrl}"\n`;
  }

  fs.writeFileSync(configPath, content);
}

/**
 * Pack OTA update archive (update.tar.gz).
 *
 * This archive is extracted directly into the extension directory on the Kindle
 * (e.g. /mnt/us/extensions/slowdash/) by check_update.sh.  It contains only
 * the extension files (bin/, config.xml, menu.json, etc.) without wrapping
 * them in an extensions/slowdash/ prefix.
 */
function packClientAssets(outputDir = path.join(__dirname, '..', 'output'), options = {}) {
  const projectRoot = path.join(__dirname, '..');
  const publicBaseUrl = options.publicBaseUrl || null;
  const kindleSource = path.join(projectRoot, 'clients', 'kindle');
  if (!fs.existsSync(kindleSource)) {
    throw new Error('clients/kindle directory does not exist. Please add Kindle client files under clients/kindle.');
  }

  const outputClientsDir = path.join(outputDir, 'clients');
  const outputKindleDir = path.join(outputClientsDir, 'kindle');
  fs.mkdirSync(outputKindleDir, { recursive: true });

  const archivePath = path.join(outputKindleDir, 'update.tar.gz');
  ensureTarAvailable();

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'slowdash-kindle-'));
  const stagedKindleDir = path.join(tempDir, 'kindle');
  fs.cpSync(kindleSource, stagedKindleDir, { recursive: true });
  cleanStagedDir(stagedKindleDir);

  // Patch config.sh (now lives in bin/)
  patchConfigWithPublicUrl(path.join(stagedKindleDir, 'bin', 'config.sh'), publicBaseUrl);

  const tarBase = stagedKindleDir;
  const result = spawnSync('tar', ['-czf', archivePath, '-C', tarBase, '.'], { stdio: 'inherit' });
  if (result.error || result.status !== 0) {
    throw new Error('Failed to create Kindle client update archive.');
  }

  fs.rmSync(tempDir, { recursive: true, force: true });

  const version = computeSha256(archivePath);
  const manifest = {
    version,
    platform: 'kindle',
    package: 'kindle/update.tar.gz',
    package_url: publicBaseUrl ? buildPublicUrl({ public_url: publicBaseUrl }, 'clients/kindle/update.tar.gz') : null,
    dashboard_url: publicBaseUrl ? buildPublicUrl({ public_url: publicBaseUrl }, 'dashboard.png') : null,
    image_url: publicBaseUrl ? buildPublicUrl({ public_url: publicBaseUrl }, 'dashboard.png') : null,
    update_url: publicBaseUrl ? buildPublicUrl({ public_url: publicBaseUrl }, 'clients/kindle/update.tar.gz') + '?v=' + Date.now() : null,
    public_url: publicBaseUrl,
    hash_algorithm: 'sha256',
    updated_at: new Date().toISOString()
  };

  fs.writeFileSync(path.join(outputClientsDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return { manifest, archivePath };
}

/**
 * Pack a KUAL extension archive for first-time installation.
 *
 * This archive wraps the extension files inside extensions/slowdash/ so it can
 * be extracted directly at the Kindle root (/mnt/us/).  It also provides an
 * unpacked copy for drag-and-drop via USB.
 */
function packKualExtension(outputDir = path.join(__dirname, '..', 'output'), options = {}) {
  const projectRoot = path.join(__dirname, '..');
  const publicBaseUrl = options.publicBaseUrl || null;
  const kindleSource = path.join(projectRoot, 'clients', 'kindle');
  if (!fs.existsSync(kindleSource)) {
    throw new Error('clients/kindle directory does not exist. Please add Kindle client files under clients/kindle.');
  }

  const outputClientsDir = path.join(outputDir, 'clients');
  const outputKindleDir = path.join(outputClientsDir, 'kindle');
  fs.mkdirSync(outputKindleDir, { recursive: true });

  const archivePath = path.join(outputKindleDir, 'slowdash-kual-extension.tar.gz');
  ensureTarAvailable();

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'slowdash-kual-'));
  const extensionsDir = path.join(tempDir, 'extensions', 'slowdash');
  fs.mkdirSync(extensionsDir, { recursive: true });

  fs.cpSync(kindleSource, extensionsDir, { recursive: true });
  cleanStagedDir(extensionsDir);

  // Patch config.sh (now lives in bin/)
  patchConfigWithPublicUrl(path.join(extensionsDir, 'bin', 'config.sh'), publicBaseUrl);

  const tarBase = tempDir;
  const result = spawnSync('tar', ['-czf', archivePath, '-C', tarBase, 'extensions'], { stdio: 'inherit' });
  if (result.error || result.status !== 0) {
    throw new Error('Failed to create KUAL extension package.');
  }

  // Provide the uncompressed folder for easy USB drag-and-drop
  const unpackedOutputDir = path.join(outputKindleDir, 'kual-extension-unpacked');
  fs.rmSync(unpackedOutputDir, { recursive: true, force: true });
  fs.mkdirSync(unpackedOutputDir, { recursive: true });
  fs.cpSync(extensionsDir, path.join(unpackedOutputDir, 'slowdash'), { recursive: true });

  fs.rmSync(tempDir, { recursive: true, force: true });

  const version = computeSha256(archivePath);
  return { archivePath, version };
}

module.exports = {
  packClientAssets,
  packKualExtension
};
