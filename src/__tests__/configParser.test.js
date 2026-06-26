const { parseConfig } = require('../configParser');
const path = require('path');

describe('Config Parser', () => {
  it('should parse a valid YAML configuration', async () => {
    const mockYamlPath = path.join(__dirname, 'mock_config.yaml');
    // In actual implementation, we might mock fs.readFileSync here.
    // For TDD, we expect parseConfig to take a file path or string and return an object.
    const config = await parseConfig(mockYamlPath);
    
    expect(config).toBeDefined();
    expect(config.settings.resolution).toBe('1072x1448');
    expect(config.layout).toBeInstanceOf(Array);
  });

  it('should throw an error if layout is missing', async () => {
    const invalidYaml = `
settings:
  resolution: 1072x1448
    `;
    await expect(parseConfig(invalidYaml, true)).rejects.toThrow('Layout is missing in configuration');
  });

  it('should apply default settings if settings block is missing', async () => {
    const minimalYaml = `
layout:
  - row:
      - widget: clock
    `;
    const config = await parseConfig(minimalYaml, true);
    expect(config.settings).toBeDefined();
    expect(config.settings.resolution).toBe('1072x1448'); // Default resolution
    expect(config.settings.color_mode).toBe('grayscale'); // Default color mode
  });
});
