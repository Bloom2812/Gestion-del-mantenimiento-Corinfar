const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto('http://localhost:8000');

  // Inject state to bypass Firebase for UI testing
  await page.evaluate(() => {
    window.state = {
      userRole: 'admin',
      monitoringConfigs: {
        'machine1': {
          variables: {
            'temp': { name: 'Temperatura', description: 'Temperatura del motor', enabled: true, thresholds: { normal: [40, 85], warning: [86, 100], critical: [101, 150] } }
          }
        }
      },
      equipment: [
        { id: 'machine1', name: 'Generador de Prueba', area: 'Area 1' },
        { id: 'machine2', name: 'Compresor A', area: 'Area 2' }
      ]
    };
    // Force active tab
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('d-none'));
    document.getElementById('monitoreo-inteligente-tab').classList.remove('d-none');

    // Render filters
    if (typeof renderSmartMonitoringFilters === 'function') {
        renderSmartMonitoringFilters();
    }
  });

  // Capture filters
  await page.screenshot({ path: 'verification/filters_dropdown.png' });

  // Click dropdown to show it
  await page.click('#monitoring-area-filter-btn');
  await page.screenshot({ path: 'verification/filters_dropdown_open.png' });

  // Show config view
  await page.evaluate(() => {
    if (typeof showMonitoringConfig === 'function') {
        showMonitoringConfig('machine1');
    }
  });

  await page.waitForTimeout(500);
  await page.screenshot({ path: 'verification/config_view_full.png' });

  await browser.close();
})();
