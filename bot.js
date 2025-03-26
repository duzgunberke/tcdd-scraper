const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Configuration
const URL = 'https://ebilet.tcddtasimacilik.gov.tr/';
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
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
    
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
            // In JavaScript, we can simply call click()
            element.click();
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
          if (items.length > 0) items[0].click();
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
            // In JavaScript, we can simply call click()
            element.click();
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
          if (items.length > 0) items[0].click();
        });
        log('Attempted to click first dropdown item as fallback');
      }
      
      await wait(1000);
      
      // Click on date input by finding "Gidiş Tarihi" text
      try {
        // Find and click on "Gidiş Tarihi" text 
        await page.evaluate(() => {
          // Find all labels on the page
          const labels = Array.from(document.querySelectorAll('label'));
          
          // Find the one containing "Gidiş Tarihi"
          const dateLabel = labels.find(label => 
            label.textContent && label.textContent.includes('Gidiş Tarihi')
          );
          
          if (dateLabel) {
            // If found, click on it or its parent to open date picker
            dateLabel.click();
            console.log("Clicked on 'Gidiş Tarihi' label");
          } else {
            // Try finding any input with datepicker attributes
            const dateInputs = Array.from(document.querySelectorAll('input[placeholder*="tarih"], input[type="date"]'));
            if (dateInputs.length > 0) {
              dateInputs[0].click();
              console.log("Clicked on date input alternative");
            } else {
              throw new Error("Could not find 'Gidiş Tarihi' label or date inputs");
            }
          }
        });
        
        log('Clicked on Gidiş Tarihi to open calendar');
        
        // Wait for calendar to appear
        await wait(1500);
        
        // Take a screenshot of the calendar
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'calendar_open.png') });
        
        // Select March 29, 2025 by targeting cell with data-date="2025-03-29"
        await page.evaluate(() => {
          // First try to find by data-date attribute
          const dateCell = document.querySelector('td[data-date="2025-03-29"]');
          
          if (dateCell) {
            dateCell.click();
            console.log("Selected date using data-date attribute");
            return;
          }
          
          // Fallback: Find March 29 by looking at all td cells with text content "29"
          // First find the March 2025 header if possible
          const monthHeaders = Array.from(document.querySelectorAll('.datepicker-switch, .month-heading, .calendar-header'));
          const marchHeader = monthHeaders.find(el => 
            el.textContent && (el.textContent.includes('Mart 2025') || el.textContent.includes('March 2025'))
          );
          
          if (marchHeader) {
            // We're in the right month, now find the 29th
            const allDayCells = document.querySelectorAll('td.day, td.datepicker-day, td:not(.disabled)');
            const day29Cell = Array.from(allDayCells).find(cell => 
              cell.textContent && cell.textContent.trim() === '29' && 
              !cell.classList.contains('disabled') && !cell.classList.contains('old') && !cell.classList.contains('new')
            );
            
            if (day29Cell) {
              day29Cell.click();
              console.log("Selected date by finding 29th day cell");
              return;
            }
          }
          
          // Last resort: Navigate to the specific month if needed and then find day 29
          const prevButtons = document.querySelectorAll('.prev, .previous, .prev-month');
          const nextButtons = document.querySelectorAll('.next, .next-month');
          
          // Try to navigate to March 2025
          // Check current month/year
          const currentMonthText = document.querySelector('.datepicker-switch, .month-heading, .calendar-header');
          if (currentMonthText) {
            const currentText = currentMonthText.textContent || '';
            
            // Navigate until we find March 2025
            if (!currentText.includes('Mart 2025') && !currentText.includes('March 2025')) {
              // Need to navigate
              // Logic to determine if we need to go forward or backward
              if (nextButtons.length > 0) {
                // Just go forward up to 12 times to find March 2025
                for (let i = 0; i < 12; i++) {
                  nextButtons[0].click();
                  // Wait a bit for the calendar to update
                  setTimeout(() => {}, 100);
                  
                  const updatedMonthText = document.querySelector('.datepicker-switch, .month-heading, .calendar-header');
                  if (updatedMonthText && 
                      (updatedMonthText.textContent.includes('Mart 2025') || 
                       updatedMonthText.textContent.includes('March 2025'))) {
                    break;
                  }
                }
              }
            }
            
            // Now try again to find day 29
            setTimeout(() => {
              const allDayCells = document.querySelectorAll('td.day, td.datepicker-day, td:not(.disabled)');
              const day29Cell = Array.from(allDayCells).find(cell => 
                cell.textContent && cell.textContent.trim() === '29' && 
                !cell.classList.contains('disabled') && !cell.classList.contains('old') && !cell.classList.contains('new')
              );
              
              if (day29Cell) {
                day29Cell.click();
                console.log("Selected date by finding 29th day cell after navigation");
              } else {
                console.log("Could not find March 29th after all attempts");
              }
            }, 300);
          }
        });
        
        log('Selected March 29, 2025 from calendar');
        
        // Wait after date selection
        await wait(1000);
        
        // Take a screenshot after date selection
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'after_date_selection.png') });
      } catch (error) {
        log(`Error selecting date: ${error.message}. Will try to continue without date selection.`);
      }
      
      // Wait for calendar to appear
      await wait(1000);
      
      // Take a screenshot of the calendar
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'calendar_open.png') });
      
      // Select the specific date from calendar
      /* Replaced with the more robust date selection in the previous code block */
      
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

async function startMonitoring() {
  log('Starting TCDD monitoring service');
  
  await checkSite();
  
  setInterval(checkSite, CHECK_INTERVAL);
  log(`Set up recurring checks every ${CHECK_INTERVAL / 60000} minutes`);
}

startMonitoring()
  .catch(error => {
    log(`Fatal error: ${error.message}`);
    process.exit(1);
  });