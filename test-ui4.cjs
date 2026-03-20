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
    await page.goto('http://localhost:5175/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
    
    // Find and click "项目规则"
    console.log('\n=== Clicking "项目规则" ===');
    const projectRulesButton = await page.locator('text=项目规则').first();
    await projectRulesButton.click();
    await page.waitForTimeout(2000);
    
    // Get screenshot
    await page.screenshot({ path: 'e:/AI RPG Balance Studio/output/screenshot4.png', fullPage: true });
    console.log('Screenshot saved');
    
    // Get more detailed HTML
    console.log('\n=== Looking for specific elements ===');
    
    // Look for stats bar
    const statsBar = await page.locator('text=概览').first();
    const statsBarVisible = await statsBar.isVisible().catch(() => false);
    console.log(`Stats overview (概览) visible: ${statsBarVisible}`);
    
    // Look for attribute table header
    const attrHeader = await page.locator('text=属性数据表').first();
    const attrHeaderVisible = await attrHeader.isVisible().catch(() => false);
    console.log(`Attribute table header visible: ${attrHeaderVisible}`);
    
    // Look for any table
    const tables = await page.locator('table').count();
    console.log(`Number of tables: ${tables}`);
    
    // Look for bottom drawer
    const drawerToggle = await page.locator('text=底部面板').first();
    const drawerToggleVisible = await drawerToggle.isVisible().catch(() => false);
    console.log(`Bottom drawer collapsed toggle visible: ${drawerToggleVisible}`);
    
    // Try clicking on bottom drawer to expand
    if (drawerToggleVisible) {
      console.log('\n=== Expanding bottom drawer ===');
      await drawerToggle.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'e:/AI RPG Balance Studio/output/screenshot5.png', fullPage: true });
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
  } finally {
    await browser.close();
  }
})();
