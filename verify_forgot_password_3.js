const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  try {
    await page.goto('http://localhost:8000/index.html');
    await page.waitForLoadState('networkidle');

    console.log('Clicking "Forgot password" link...');
    await page.click('text=¿Olvidó su contraseña?');

    console.log('Waiting for modal...');
    await page.waitForSelector('#forgot-password-modal', { state: 'visible' });
    await page.screenshot({ path: 'verification/forgot_modal_open.png' });

    console.log('Filling username...');
    await page.fill('#forgot-username', 'dennis joel');
    await page.screenshot({ path: 'verification/forgot_modal_filled.png' });

    console.log('Clicking notify button...');
    // Use evaluate to avoid interception issues
    await page.evaluate(() => {
      document.querySelector('#submit-forgot-password').click();
    });

    console.log('Waiting for toast or changes...');
    // Wait for the loading spinner to potentially show and hide
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'verification/forgot_after_click.png' });

  } catch (error) {
    console.error('Error during verification:', error);
    await page.screenshot({ path: 'verification/error.png' });
  } finally {
    await browser.close();
  }
})();
