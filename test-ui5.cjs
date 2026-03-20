const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const consoleErrors = [];
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  
  page.on('pageerror', error => {
    consoleErrors.push(`Page Error: ${error.message}`);
  });

  try {
    console.log('Opening http://localhost:5175/...');
    await page.goto('http://localhost:5175/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(5000);
    
    // Get initial screenshot
    await page.screenshot({ path: 'e:/AI RPG Balance Studio/output/initial.png', fullPage: true });
    console.log('Initial screenshot saved');
    
    // Check what's in the viewport
    console.log('\n=== Page Structure ===');
    const bodyContent = await page.evaluate(() => {
      const body = document.body;
      return {
        innerHTML: body.innerHTML.substring(0, 2000),
        childCount: body.children.length
      };
    });
    console.log('Body children count:', bodyContent.childCount);
    console.log('Body innerHTML preview:', bodyContent.innerHTML);
    
    // Look for the MainEditor
    console.log('\n=== Looking for MainEditor ===');
    const mainEditor = await page.locator('[class*="flex-1"]').first();
    const mainEditorVisible = await mainEditor.isVisible().catch(() => false);
    console.log('Main flex container visible:', mainEditorVisible);
    
    // Console messages
    console.log('\n=== ALL CONSOLE MESSAGES ===');
    consoleMessages.forEach(msg => console.log(msg));
    
  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'e:/AI RPG Balance Studio/output/error.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
