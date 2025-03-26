const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Configuration
const TCDD_URL = 'https://ebilet.tcddtasimacilik.gov.tr/';
const DEPARTURE_TEXT = 'ANKARA GAR, ANKARA';
const ARRIVAL_TEXT = 'SELÇUKLU YHT (KONYA), KONYA';
const DEPARTURE_XPATH = '//*[@id="gidis-98"]';
const ARRIVAL_XPATH = '//*[@id="donus-1336"]';
const CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
const LOG_FILE = path.join(__dirname, 'tcdd_monitor_log.txt');
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

// Create the screenshot directory if it doesn't exist
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR);
}

// Function to append to log
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}\n`;
  
  console.log(logMessage.trim());
  fs.appendFileSync(LOG_FILE, logMessage);
}

// Helper function for waiting
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Variable to store the last value
let lastValue = null;

async function checkSite() {
  log('Starting new check...');
  const browser = await puppeteer.launch({
    headless: false, // Use non-headless for debugging
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    
    // Navigate to the site
    log('Navigating to TCDD website...');
    await page.goto(TCDD_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Take a screenshot of the initial page
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'initial_page.png') });
    
    try {
      // Click on departure input to open dropdown
      const fromInputSelector = '#fromTrainInput';
      await page.waitForSelector(fromInputSelector);
      await page.click(fromInputSelector);
      log('Clicked on departure input');
      
      // Type the full departure location text
      await page.type(fromInputSelector, DEPARTURE_TEXT);
      log(`Typed departure text: ${DEPARTURE_TEXT}`);
      
      // Wait for dropdown options to appear
      await wait(2000);
      
      // Take a screenshot of the dropdown
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'departure_dropdown.png') });
      
      // Click on the specific dropdown item using evaluate
      try {
        await page.evaluate((xpath) => {
          const element = document.evaluate(
            xpath, 
            document, 
            null, 
            XPathResult.FIRST_ORDERED_NODE_TYPE, 
            null
          ).singleNodeValue;
          
          if (element) {
            // Cast to HTMLElement to access click() method
            (element as HTMLElement).click();
          } else {
            throw new Error(`Element with XPath ${xpath} not found`);
          }
        }, DEPARTURE_XPATH);
        
        log(`Clicked on departure dropdown item with XPath: ${DEPARTURE_XPATH}`);
      } catch (error) {
        log(`Error clicking departure dropdown: ${error.message}`);
        // Try clicking the first dropdown item as fallback
        await page.evaluate(() => {
          const items = document.querySelectorAll('.dropdown-item');
          if (items.length > 0) (items[0] as HTMLElement).click();
        });
        log('Attempted to click first dropdown item as fallback');
      }
      
      await wait(1000);
      
      // Click on arrival input to open dropdown
      const toInputSelector = '#toTrainInput';
      await page.waitForSelector(toInputSelector);
      await page.click(toInputSelector);
      log('Clicked on arrival input');
      
      // Type the full arrival location text
      await page.type(toInputSelector, ARRIVAL_TEXT);
      log(`Typed arrival text: ${ARRIVAL_TEXT}`);
      
      // Wait for dropdown options to appear
      await wait(2000);
      
      // Take a screenshot of the dropdown
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'arrival_dropdown.png') });
      
      // Click on the specific dropdown item using evaluate
      try {
        await page.evaluate((xpath) => {
          const element = document.evaluate(
            xpath, 
            document, 
            null, 
            XPathResult.FIRST_ORDERED_NODE_TYPE, 
            null
          ).singleNodeValue;
          
          if (element) {
            // Cast to HTMLElement to access click() method
            (element as HTMLElement).click();
          } else {
            throw new Error(`Element with XPath ${xpath} not found`);
          }
        }, ARRIVAL_XPATH);
        
        log(`Clicked on arrival dropdown item with XPath: ${ARRIVAL_XPATH}`);
      } catch (error) {
        log(`Error clicking arrival dropdown: ${error.message}`);
        // Try clicking the first dropdown item as fallback
        await page.evaluate(() => {
          const items = document.querySelectorAll('.dropdown-item');
          if (items.length > 0) (items[0] as HTMLElement).click();
        });
        log('Attempted to click first dropdown item as fallback');
      }
      
      await wait(1000);
      
      // Click on date input to open calendar
      const dateInputXPath = '//*[@id="__BVID__100"]/section/div[3]/div/div/div[2]/div/div/div[1]/div/div[1]/input';
      await page.evaluate((xpath) => {
        const element = document.evaluate(
          xpath, 
          document, 
          null, 
          XPathResult.FIRST_ORDERED_NODE_TYPE, 
          null
        ).singleNodeValue;
        
        if (element) {
          // Cast to HTMLElement to access click() method
          (element as HTMLElement).click();
        } else {
          throw new Error(`Date input with XPath ${xpath} not found`);
        }
      }, dateInputXPath);
      log('Clicked date input to open calendar');
      
      // Wait for calendar to appear
      await wait(1000);
      
      // Take a screenshot of the calendar
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'calendar_open.png') });
      
      // Select the specific date from calendar
      const dateXPath = '//*[@id="__BVID__100"]/section/div[3]/div/div/div[3]/div[2]/div/div[1]/div/table/tbody/tr[6]/td[6]';
      await page.evaluate((xpath) => {
        const element = document.evaluate(
          xpath, 
          document, 
          null, 
          XPathResult.FIRST_ORDERED_NODE_TYPE, 
          null
        ).singleNodeValue;
        
        if (element) {
          // Cast to HTMLElement to access click() method
          (element as HTMLElement).click();
        } else {
          throw new Error(`Calendar date with XPath ${xpath} not found`);
        }
      }, dateXPath);
      log('Selected date from calendar');
      
      // Wait after date selection
      await wait(1000);
      
      // Take a screenshot after date selection
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'after_date_selection.png') });
      
      // Click search button
      const searchButtonSelector = '#searchSeferButton';
      await page.waitForSelector(searchButtonSelector);
      await page.click(searchButtonSelector);
      log('Clicked search button');
      
      // Take a screenshot after search
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'after_search.png') });
      
      // Wait for the results page to load
      const targetSelector = '#gidis0btn > div > div:nth-child(3) > div > div > span';
      await page.waitForSelector(targetSelector, { timeout: 30000 });
      
      // Get the text from the target span
      const currentValue = await page.$eval(targetSelector, el => el.textContent.trim());
      
      // Take a screenshot of the results
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const screenshotPath = path.join(SCREENSHOT_DIR, `tcdd_${timestamp}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      
      // Check if the value has changed
      if (lastValue === null) {
        log(`Initial value detected: "${currentValue}"`);
        lastValue = currentValue;
      } else if (currentValue !== lastValue) {
        log(`⚠️ VALUE CHANGED! Previous: "${lastValue}" -> Current: "${currentValue}"`);
        // Here you can add additional notifications like sending an email or SMS
        lastValue = currentValue;
      } else {
        log(`No change detected. Current value: "${currentValue}"`);
      }
    } catch (error) {
      log(`Error during process: ${error.message}`);
      const errorScreenshotPath = path.join(SCREENSHOT_DIR, `error_${new Date().toISOString().replace(/:/g, '-')}.png`);
      await page.screenshot({ path: errorScreenshotPath, fullPage: true });
    }
  } catch (error) {
    log(`Error during site check: ${error.message}`);
  } finally {
    await browser.close();
    log('Browser closed');
  }
}

// Main function to run the monitoring
async function startMonitoring() {
  log('Starting TCDD monitoring service');
  
  // Run the first check
  await checkSite();
  
  // Set up recurring checks
  setInterval(checkSite, CHECK_INTERVAL);
  log(`Set up recurring checks every ${CHECK_INTERVAL / 60000} minutes`);
}

// Start the monitoring process
startMonitoring()
  .catch(error => {
    log(`Fatal error: ${error.message}`);
    process.exit(1);
  });