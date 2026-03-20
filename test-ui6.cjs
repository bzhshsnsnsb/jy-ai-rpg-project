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
    
    // Get initial screenshot - BEFORE clicking
    await page.screenshot({ path: 'e:/AI RPG Balance Studio/output/before-click.png', fullPage: true });
    console.log('Before click screenshot saved');
    
    // Find ALL elements containing "项目规则"
    console.log('\n=== Finding ALL "项目规则" elements ===');
    const allProjectRules = await page.locator('text=项目规则').all();
    console.log(`Found ${allProjectRules.length} elements with "项目规则" text`);
    for (let i = 0; i < allProjectRules.length; i++) {
      const visible = await allProjectRules[i].isVisible();
      const tagName = await allProjectRules[i].evaluate(el => el.tagName);
      const parentText = await allProjectRules[i].locator('xpath=../..').first().textContent().catch(() => '');
      console.log(`  ${i}: tag=${tagName}, visible=${visible}, parentText=${parentText.substring(0, 50)}`);
    }
    
    // Now try clicking on a specific element - the root tree node (first one inside sidebar)
    console.log('\n=== Clicking first "项目规则" in sidebar ===');
    const sidebarProjectRules = await page.locator('div').filter({ hasText: /^项目规则$/ }).first();
    const sidebarVisible = await sidebarProjectRules.isVisible().catch(() => false);
    console.log(`Sidebar "项目规则" visible: ${sidebarVisible}`);
    
    if (sidebarVisible) {
      await sidebarProjectRules.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'e:/AI RPG Balance Studio/output/after-click.png', fullPage: true });
      console.log('After click screenshot saved');
    }
    
    // Check for active editor state
    console.log('\n=== Checking if workspace loaded ===');
    const workspaceElements = ['概览', '属性数据表', '自定义属性', '添加属性'];
    for (const text of workspaceElements) {
      const el = await page.locator(`text=${text}`).first();
      const visible = await el.isVisible().catch(() => false);
      console.log(`"${text}" visible: ${visible}`);
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
