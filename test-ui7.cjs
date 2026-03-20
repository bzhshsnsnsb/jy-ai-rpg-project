const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    console.log('Opening http://localhost:5175/...');
    await page.goto('http://localhost:5175/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    // Get initial screenshot
    await page.screenshot({ path: 'e:/AI RPG Balance Studio/output/test7-initial.png', fullPage: true });
    console.log('Initial screenshot saved');
    
    // Get sidebar structure first
    console.log('\n=== Sidebar structure ===');
    const sidebar = await page.locator('[class*="bg-\\[var(--color-bg-secondary)\\]"]').first();
    const sidebarHTML = await sidebar.innerHTML();
    console.log('Sidebar HTML preview:', sidebarHTML.substring(0, 500));
    
    // Try clicking the specific element - find by the text and get its parent button/div
    console.log('\n=== Clicking on 项目规则 (element 1) ===');
    const projectRules = await page.locator('span:has-text("项目规则")').nth(1);  // 2nd one in sidebar
    const isVisible = await projectRules.isVisible();
    console.log(`Element visible: ${isVisible}`);
    
    if (isVisible) {
      // Try clicking directly on the span
      await projectRules.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'e:/AI RPG Balance Studio/output/test7-after-click.png', fullPage: true });
      console.log('After click screenshot saved');
    }
    
    // Check what changed
    console.log('\n=== Checking main editor area ===');
    const mainContent = await page.locator('main, [class*="flex-1"]').first();
    const mainText = await mainContent.textContent();
    console.log('Main content:', mainText.substring(0, 300));
    
    // Look for tabs in main area
    console.log('\n=== Looking for tabs ===');
    const allButtons = await page.locator('button').all();
    console.log(`Total buttons: ${allButtons.length}`);
    for (let i = 0; i < Math.min(allButtons.length, 20); i++) {
      const text = await allButtons[i].textContent();
      if (text && text.trim()) {
        const visible = await allButtons[i].isVisible();
        console.log(`Button ${i}: "${text.trim().substring(0, 30)}" visible=${visible}`);
      }
    }
    
    // Console errors
    console.log('\n=== CONSOLE ERRORS ===');
    if (consoleErrors.length > 0) {
      consoleErrors.forEach(err => console.log(err));
    } else {
      console.log('No console errors');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'e:/AI RPG Balance Studio/output/test7-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
