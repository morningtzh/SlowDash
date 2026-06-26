const { renderToImage } = require('../renderer');

describe('Puppeteer Renderer', () => {
  it('should take an HTML string and return a valid image Buffer', async () => {
    const mockHtml = '<html><body><h1>SlowDash</h1></body></html>';
    const settings = {
      resolution: '1072x1448',
      color_mode: 'grayscale'
    };

    // Assuming renderToImage returns a Buffer of a PNG image
    const imageBuffer = await renderToImage(mockHtml, settings);
    
    expect(Buffer.isBuffer(imageBuffer)).toBe(true);
    // PNG files always start with an 8-byte signature: 89 50 4E 47 0D 0A 1A 0A
    expect(imageBuffer.toString('hex', 0, 4)).toBe('89504e47');
  });

  it('should throw an error if HTML string is empty', async () => {
    await expect(renderToImage('', {})).rejects.toThrow('HTML content cannot be empty');
  });
});
