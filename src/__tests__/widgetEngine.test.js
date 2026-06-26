const { renderWidget } = require('../widgetEngine');
const path = require('path');
const fs = require('fs');

describe('Widget Engine', () => {
  const mockWidgetConfig = {
    widget: 'clock',
    timezone: 'Asia/Shanghai'
  };

  it('should successfully render a widget HTML based on config', async () => {
    const htmlOutput = await renderWidget(mockWidgetConfig);
    expect(typeof htmlOutput).toBe('string');
    // Clock widget template contains "flex flex-col items-center"
    expect(htmlOutput).toContain('flex flex-col'); 
  });

  it('should handle fetcher API errors gracefully', async () => {
    const errorConfig = {
      widget: 'clock',
      simulateError: true 
    };

    const htmlOutput = await renderWidget(errorConfig);
    expect(htmlOutput).toContain('Widget Error');
    expect(htmlOutput).toContain('Failed to load data');
  });

  it('should return a placeholder for non-existent widget modules', async () => {
    const unknownConfig = {
      widget: 'non_existent_widget'
    };

    const htmlOutput = await renderWidget(unknownConfig);
    expect(htmlOutput).toContain('non_existent_widget');
    expect(htmlOutput).toContain('Waiting for API keys');
  });
});
