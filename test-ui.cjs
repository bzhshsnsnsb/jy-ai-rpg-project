const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Collect console messages
  const consoleLogs = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleLogs.push(`[ERROR] ${msg.text()}`);
    }
  });

  try {
    console.log('Opening http://localhost:5175/...');
    await page.goto('http://localhost:5175/', { waitUntil: 'networkidle', timeout: 30000 });
    
    console.log('\n=== Page loaded, waiting for initial render... ===');
    await page.waitForTimeout(2000);
    
    // Check 1: Look for sidebar with "项目规则"
    console.log('\n=== CHECK 1: Finding "项目规则" in sidebar ===');
    const projectRulesButton = await page.locator('text=项目规则').first();
    const isVisible = await projectRulesButton.isVisible();
    console.log(`Project Rules button visible: ${isVisible}`);
    
    if (isVisible) {
      await projectRulesButton.click();
      console.log('Clicked on "项目规则"');
      await page.waitForTimeout(1000);
    }
    
    // Check 2: Look for tabs in the workspace
    console.log('\n=== CHECK 2: Looking for tabs ===');
    const tabs = ['自定义属性', '回合模型', '资源模型'];
    for (const tabName of tabs) {
      const tab = await page.locator(`text=${tabName}`).first();
      const tabVisible = await tab.isVisible().catch(() => false);
      console.log(`Tab "${tabName}" visible: ${tabVisible}`);
    }
    
    // Check 3: Stats overview bar
    console.log('\n=== CHECK 3: Stats overview bar ===');
    const statsBar = await page.locator('.stats-overview, [class*="stats"]').first();
    const statsVisible = await statsBar.isVisible().catch(() => false);
    console.log(`Stats bar visible: ${statsVisible}`);
    
    // Check 4: Attribute table
    console.log('\n=== CHECK 4: Attribute table ===');
    const table = await page.locator('table').first();
    const tableVisible = await table.isVisible().catch(() => false);
    console.log(`Table visible: ${tableVisible}`);
    if (tableVisible) {
      const rows = await table.locator('tr').count();
      console.log(`Table has ${rows} rows`);
    }
    
    // Check 5: Toolbar with project name
    console.log('\n=== CHECK 5: Toolbar ===');
    const toolbar = await page.locator('[class*="toolbar"], header').first();
    const toolbarVisible = await toolbar.isVisible().catch(() => false);
    console.log(`Toolbar visible: ${toolbarVisible}`);
    
    // Check 6: Bottom drawer
    console.log('\n=== CHECK 6: Bottom drawer ===');
    const drawer = await page.locator('[class*="drawer"], [class*="bottom"]').first();
    const drawerVisible = await drawer.isVisible().catch(() => false);
    console.log(`Bottom drawer visible: ${drawerVisible}`);
    
    // Console errors
    console.log('\n=== CONSOLE ERRORS ===');
    if (consoleLogs.length > 0) {
      consoleLogs.forEach(log => console.log(log));
    } else {
      console.log('No console errors detected');
    }
    
    // Take screenshot
    console.log('\n=== Taking screenshot ===');
    await page.screenshot({ path: 'e:/AI RPG Balance Studio/output/screenshot.png', fullPage: true });
    console.log('Screenshot saved to output/screenshot.png');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
