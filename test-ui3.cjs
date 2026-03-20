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
    await page.goto('http://localhost:5175/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    console.log('\n=== Page loaded ===');
    await page.waitForTimeout(3000);
    
    // Click on "项目规则" in sidebar
    console.log('\n=== CHECK 1: Clicking "项目规则" in sidebar ===');
    const projectRulesButton = await page.locator('text=项目规则').first();
    await projectRulesButton.click();
    console.log('Clicked on "项目规则"');
    await page.waitForTimeout(2000);
    
    // Take screenshot
    console.log('\n=== Taking screenshot ===');
    await page.screenshot({ path: 'e:/AI RPG Balance Studio/output/screenshot3.png', fullPage: true });
    console.log('Screenshot saved');
    
    // Get page HTML
    console.log('\n=== Page HTML ===');
    const html = await page.content();
    console.log('HTML length:', html.length);
    console.log('HTML preview:', html.substring(0, 1000));
    
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
    await page.screenshot({ path: 'e:/AI RPG Balance Studio/output/error-screenshot.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
