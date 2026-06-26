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

  const tarBase = tempDir;
  const tarName = 'kindle';
  const result = spawnSync('tar', ['-czf', archivePath, '-C', tarBase, tarName], { stdio: 'inherit' });
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
    update_url: publicBaseUrl ? buildPublicUrl({ public_url: publicBaseUrl }, 'clients/kindle/update.tar.gz') : null,
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

  fs.cpSync(kindleSource, path.join(extensionsDir, 'data'), { recursive: true });

  const configPath = path.join(extensionsDir, 'data', 'config.sh');
  if (publicBaseUrl) {
    const configContent = fs.readFileSync(configPath, 'utf8');
    const updatedConfig = configContent.replace(
      /# 公共可访问的基础 URL（优先级高于 SLOWDASH_SERVER_URL）\n# 例如：https:\/\/your-public-bucket-url\n# SLOWDASH_PUBLIC_URL="https:\/\/your-public-bucket-url"\n/,
      `# 公共可访问的基础 URL（优先级高于 SLOWDASH_SERVER_URL）\n# 例如：https://your-public-bucket-url\nSLOWDASH_PUBLIC_URL="${publicBaseUrl}"\n`
    );
    fs.writeFileSync(configPath, updatedConfig);
  }

  const installScript = `#!/bin/sh

INSTALL_DIR="/mnt/us/slowdash"
KUAL_EXT_DIR="/mnt/us/extensions/slowdash"
mkdir -p "$INSTALL_DIR"

cp -r "$(dirname "$0")/data/"* "$INSTALL_DIR/" 2>/dev/null || true

if [ -f "$INSTALL_DIR/bin/display_dashboard.sh" ]; then
  chmod +x "$INSTALL_DIR/bin/"*.sh
fi

# 为 KUAL 创建菜单入口
mkdir -p "$KUAL_EXT_DIR"
if [ -f "$(dirname "$0")/menu.json" ]; then
  cp "$(dirname "$0")/menu.json" "$KUAL_EXT_DIR/"
fi

echo "SlowDash Kindle client installed at $INSTALL_DIR"
`;

  const uninstallScript = `#!/bin/sh

INSTALL_DIR="/mnt/us/slowdash"
KUAL_EXT_DIR="/mnt/us/extensions/slowdash"

if [ -d "$INSTALL_DIR" ]; then
  rm -rf "$INSTALL_DIR"
fi

if [ -d "$KUAL_EXT_DIR" ]; then
  rm -rf "$KUAL_EXT_DIR"
fi

echo "SlowDash Kindle client uninstalled."
`;

  const installPathSrc = path.join(kindleSource, 'install.sh');
  const uninstallPathSrc = path.join(kindleSource, 'uninstall.sh');

  if (fs.existsSync(installPathSrc)) {
    fs.copyFileSync(installPathSrc, path.join(extensionsDir, 'install.sh'));
    fs.chmodSync(path.join(extensionsDir, 'install.sh'), 0o755);
  } else {
    fs.writeFileSync(path.join(extensionsDir, 'install.sh'), installScript);
    fs.chmodSync(path.join(extensionsDir, 'install.sh'), 0o755);
  }

  if (fs.existsSync(uninstallPathSrc)) {
    fs.copyFileSync(uninstallPathSrc, path.join(extensionsDir, 'uninstall.sh'));
    fs.chmodSync(path.join(extensionsDir, 'uninstall.sh'), 0o755);
  } else {
    fs.writeFileSync(path.join(extensionsDir, 'uninstall.sh'), uninstallScript);
    fs.chmodSync(path.join(extensionsDir, 'uninstall.sh'), 0o755);
  }

  const tarBase = tempDir;
  const result = spawnSync('tar', ['-czf', archivePath, '-C', tarBase, 'extensions'], { stdio: 'inherit' });
  if (result.error || result.status !== 0) {
    throw new Error('Failed to create MR Installer package.');
  }

  fs.rmSync(tempDir, { recursive: true, force: true });

  const version = computeSha256(archivePath);
  return { archivePath, version };
}

module.exports = {
  packClientAssets,
  packClientAssetsMRInstaller
};
