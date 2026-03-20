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
    
    console.log('\n=== Page loaded ===');
    await page.waitForTimeout(2000);
    
    // Click on "项目规则" in sidebar
    console.log('\n=== CHECK 1: Clicking "项目规则" in sidebar ===');
    const projectRulesButton = await page.locator('text=项目规则').first();
    await projectRulesButton.click();
    console.log('Clicked on "项目规则"');
    await page.waitForTimeout(1500);
    
    // Get visible text content of main area
    console.log('\n=== MAIN AREA CONTENT ===');
    const mainContent = await page.locator('main').first();
    const contentText = await mainContent.textContent();
    console.log('Main content preview:', contentText.substring(0, 500));
    
    // Look for tabs more specifically
    console.log('\n=== CHECK 2: Looking for tab elements ===');
    const allTabs = await page.locator('button, [role="tab"]').all();
    console.log(`Found ${allTabs.length} tab-like elements`);
    for (let i = 0; i < Math.min(allTabs.length, 10); i++) {
      const text = await allTabs[i].textContent();
      const visible = await allTabs[i].isVisible();
      console.log(`  Tab ${i}: "${text.trim()}" visible: ${visible}`);
    }
    
    // Try clicking each tab
    console.log('\n=== CHECK 2b: Clicking each tab ===');
    const tabNames = ['自定义属性', '回合模型', '资源模型', '战斗平衡'];
    for (const tabName of tabNames) {
      const tab = await page.locator(`button:has-text("${tabName}")`).first();
      const visible = await tab.isVisible().catch(() => false);
      if (visible) {
        console.log(`Clicking tab: ${tabName}`);
        await tab.click();
        await page.waitForTimeout(500);
      }
    }
    
    // Check for stats bar more specifically
    console.log('\n=== CHECK 3: Looking for stats overview bar ===');
    // Try different selectors
    const statsSelectors = ['.stats-overview', '[class*="stats"]', '[class*="overview"]', 'header'];
    for (const selector of statsSelectors) {
      const el = await page.locator(selector).first();
      const visible = await el.isVisible().catch(() => false);
      if (visible) {
        const text = await el.textContent();
        console.log(`Found stats element with selector "${selector}": ${text.substring(0, 100)}`);
      }
    }
    
    // Look for the toolbar
    console.log('\n=== CHECK 5: Toolbar ===');
    const toolbarText = await page.locator('header').first().textContent();
    console.log('Toolbar content:', toolbarText.substring(0, 200));
    
    // Look for bottom drawer
    console.log('\n=== CHECK 6: Bottom drawer ===');
    const drawerCandidates = await page.locator('[class*="drawer"], [class*="bottom"], .bottom-drawer').all();
    console.log(`Found ${drawerCandidates.length} drawer candidates`);
    for (let i = 0; i < drawerCandidates.length; i++) {
      const visible = await drawerCandidates[i].isVisible().catch(() => false);
      const text = await drawerCandidates[i].textContent().catch(() => '');
      console.log(`Drawer ${i}: visible=${visible}, text="${text.substring(0, 100)}"`);
    }
    
    // Look for table
    console.log('\n=== CHECK 4: Looking for tables ===');
    const tables = await page.locator('table').all();
    console.log(`Found ${tables.length} tables`);
    for (let i = 0; i < tables.length; i++) {
      const visible = await tables[i].isVisible().catch(() => false);
      const rows = await tables[i].locator('tr').count().catch(() => 0);
      console.log(`Table ${i}: visible=${visible}, rows=${rows}`);
    }
    
    // Check for any error boundaries or broken UI
    console.log('\n=== CHECK 7: Error states ===');
    const errorMessages = await page.locator('[class*="error"], .error, [class*="Error"]').all();
    console.log(`Found ${errorMessages.length} error elements`);
    
    // Final screenshot
    console.log('\n=== Taking final screenshot ===');
    await page.screenshot({ path: 'e:/AI RPG Balance Studio/output/screenshot2.png', fullPage: true });
    
    // Console errors
    console.log('\n=== CONSOLE ERRORS ===');
    if (consoleLogs.length > 0) {
      consoleLogs.forEach(log => console.log(log));
    } else {
      console.log('No console errors detected');
    }
    
    console.log('\n=== TEST COMPLETE ===');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
