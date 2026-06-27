const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { buildPublicUrl } = require('./storage/s3Client');

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

  const configPath = path.join(stagedKindleDir, 'config.sh');
  if (publicBaseUrl) {
    const configContent = fs.readFileSync(configPath, 'utf8');
    const updatedConfig = configContent.replace(
      /# 公共可访问的基础 URL（优先级高于 SLOWDASH_SERVER_URL）\n# 例如：https:\/\/your-public-bucket-url\n# SLOWDASH_PUBLIC_URL="https:\/\/your-public-bucket-url"\n/,
      `# 公共可访问的基础 URL（优先级高于 SLOWDASH_SERVER_URL）\n# 例如：https://your-public-bucket-url\nSLOWDASH_PUBLIC_URL="${publicBaseUrl}"\n`
    );
    fs.writeFileSync(configPath, updatedConfig);
  }

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

function packClientAssetsMRInstaller(outputDir = path.join(__dirname, '..', 'output'), options = {}) {
  const projectRoot = path.join(__dirname, '..');
  const publicBaseUrl = options.publicBaseUrl || null;
  const kindleSource = path.join(projectRoot, 'clients', 'kindle');
  if (!fs.existsSync(kindleSource)) {
    throw new Error('clients/kindle directory does not exist. Please add Kindle client files under clients/kindle.');
  }

  const outputClientsDir = path.join(outputDir, 'clients');
  const outputKindleDir = path.join(outputClientsDir, 'kindle');
  fs.mkdirSync(outputKindleDir, { recursive: true });

  const archivePath = path.join(outputKindleDir, 'slowdash-mr-installer.tar.gz');
  ensureTarAvailable();

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'slowdash-mr-'));
  const extensionsDir = path.join(tempDir, 'extensions', 'slowdash');
  fs.mkdirSync(extensionsDir, { recursive: true });

  fs.cpSync(kindleSource, extensionsDir, { recursive: true });

  const configPath = path.join(extensionsDir, 'config.sh');
  if (publicBaseUrl) {
    const configContent = fs.readFileSync(configPath, 'utf8');
    const updatedConfig = configContent.replace(
      /# 公共可访问的基础 URL（优先级高于 SLOWDASH_SERVER_URL）\n# 例如：https:\/\/your-public-bucket-url\n# SLOWDASH_PUBLIC_URL="https:\/\/your-public-bucket-url"\n/,
      `# 公共可访问的基础 URL（优先级高于 SLOWDASH_SERVER_URL）\n# 例如：https://your-public-bucket-url\nSLOWDASH_PUBLIC_URL="${publicBaseUrl}"\n`
    );
    fs.writeFileSync(configPath, updatedConfig);
  }

  const tarBase = tempDir;
  const result = spawnSync('tar', ['-czf', archivePath, '-C', tarBase, 'extensions'], { stdio: 'inherit' });
  if (result.error || result.status !== 0) {
    throw new Error('Failed to create MR Installer package.');
  }

  // Provide the uncompressed folder for easy web browser drag-and-drop
  const unpackedOutputDir = path.join(outputKindleDir, 'kual-extension-unpacked');
  fs.rmSync(unpackedOutputDir, { recursive: true, force: true });
  fs.mkdirSync(unpackedOutputDir, { recursive: true });
  fs.cpSync(extensionsDir, path.join(unpackedOutputDir, 'slowdash'), { recursive: true });

  const binPath = path.join(outputKindleDir, 'Update_slowdash_install.bin');
  const kindletoolResult = spawnSync('kindletool', [
    'create', 'ota2',
    '-d', 'k5', '-d', 'pw', '-d', 'pw2', '-d', 'kv', '-d', 'pw3', '-d', 'koa', '-d', 'pw4', '-d', 'kt4', '-d', 'koa2', '-d', 'koa3', '-d', 'pw5',
    tempDir, binPath
  ], { stdio: 'ignore' });
  
  if (!kindletoolResult.error && kindletoolResult.status === 0) {
    console.log('[INFO] kindletool found! Generated MRPI installer: Update_slowdash_install.bin');
  } else {
    console.log('[WARN] kindletool not found. Outputting .tar.gz format instead of MRPI .bin format. (Please install kindletool if you need the .bin file)');
  }

  fs.rmSync(tempDir, { recursive: true, force: true });

  const version = computeSha256(archivePath);
  return { archivePath, version };
}

module.exports = {
  packClientAssets,
  packClientAssetsMRInstaller
};
