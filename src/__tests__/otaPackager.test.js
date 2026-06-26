const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { packClientAssets } = require('../otaPackager');

describe('OTA packager', () => {
  it('renders the public URL into the Kindle client config inside the OTA archive', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'slowdash-ota-'));
    const outputDir = path.join(tempRoot, 'output');
    fs.mkdirSync(outputDir, { recursive: true });

    const { archivePath } = packClientAssets(outputDir, { publicBaseUrl: 'https://cdn.example.com/public' });
    expect(fs.existsSync(archivePath)).toBe(true);

    const extractDir = path.join(tempRoot, 'extract');
    fs.mkdirSync(extractDir, { recursive: true });
    const extractResult = spawnSync('tar', ['-xzf', archivePath, '-C', extractDir], { stdio: 'pipe' });
    expect(extractResult.status).toBe(0);

    const configPath = path.join(extractDir, 'kindle', 'config.sh');
    const configContent = fs.readFileSync(configPath, 'utf8');
    expect(configContent).toContain('SLOWDASH_PUBLIC_URL="https://cdn.example.com/public"');
  });
});
