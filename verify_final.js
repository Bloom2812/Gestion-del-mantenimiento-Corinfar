const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000');

  // Login
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);

  // Go to Planes tab
  await page.click('a:has-text("Planes")');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'final_grid.png' });

  // Try to click "Ver Planes" on a machine card if any
  const verPlanesBtn = page.locator('.wp-machine-card button:has-text("Ver Planes")').first();
  if (await verPlanesBtn.isVisible()) {
      await verPlanesBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'final_detail.png' });

      // Check if buttons are there
      const previsualizarBtn = page.locator('button:has-text("Previsualizar")');
      console.log('Previsualizar button visible:', await previsualizarBtn.isVisible());
  }

  await browser.close();
})();
