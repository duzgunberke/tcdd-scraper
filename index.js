const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const child_process = require('child_process');
const os = require('os');

const URL = 'https://ebilet.tcddtasimacilik.gov.tr/';
const DEPARTURE_TEXT = 'ANKARA GAR, ANKARA';
const ARRIVAL_TEXT = 'SELÇUKLU YHT (KONYA), KONYA';
const DEPARTURE_XPATH = '//*[@id="gidis-98"]';
const ARRIVAL_XPATH = '//*[@id="donus-1336"]';
const CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
const LOG_FILE = path.join(__dirname, 'tcdd_monitor_log.txt');
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');
const INITIAL_VALUE = "(2)"; 

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR);
}

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}\n`;
  
  console.log(logMessage.trim());
  fs.appendFileSync(LOG_FILE, logMessage);
}

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function playAlertSound() {
  try {
    const platform = os.platform();
    
    if (platform === 'darwin') {
      child_process.exec('afplay /System/Library/Sounds/Sosumi.aiff');
      child_process.exec('say "Bilet durumunda değişiklik tespit edildi!"');
    } else if (platform === 'win32') {
      child_process.exec('powershell -c (New-Object Media.SoundPlayer "C:\\Windows\\Media\\notify.wav").PlaySync()');
      child_process.exec('powershell -c [Reflection.Assembly]::LoadWithPartialName(\\"System.Speech\\"); (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak(\\"Bilet durumunda değişiklik tespit edildi!\\")');
    } else if (platform === 'linux') {
      child_process.exec('paplay /usr/share/sounds/freedesktop/stereo/complete.oga || aplay /usr/share/sounds/sound-icons/glass-water-1.wav || spd-say "Bilet durumunda değişiklik tespit edildi!"');
    }
    
    log('Alert sound played successfully');
  } catch (error) {
    log(`Failed to play alert sound: ${error.message}`);
  }
}

function showNotification(message) {
  try {
    const platform = os.platform();
    
    if (platform === 'darwin') {
      child_process.exec(`osascript -e 'display notification "${message}" with title "TCDD Bilet Durumu"'`);
    } else if (platform === 'win32') {
      child_process.exec(`powershell -c [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType=WindowsRuntime] | Out-Null; [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType=WindowsRuntime] | Out-Null; $template = [Windows.UI.Notifications.ToastTemplateType]::ToastText02; $xml = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent($template); $xml.GetElementsByTagName(\\"text\\")[0].InnerText = \\"TCDD Bilet Durumu\\"; $xml.GetElementsByTagName(\\"text\\")[1].InnerText = \\"${message}\\"; $toast = [Windows.UI.Notifications.ToastNotification]::new($xml); [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier(\\"TCDD Bildirim\\").Show($toast);`);
    } else if (platform === 'linux') {
      child_process.exec(`notify-send "TCDD Bilet Durumu" "${message}"`);
    }
    
    log('Desktop notification shown successfully');
  } catch (error) {
    log(`Failed to show desktop notification: ${error.message}`);
  }
}

let lastValue = null;

async function checkSite() {
  log('Starting new check...');
  const browser = await puppeteer.launch({
    headless: false, 
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    
    log('Navigating to TCDD website...');
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
    
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'initial_page.png') });
    
    try {
      const fromInputSelector = '#fromTrainInput';
      await page.waitForSelector(fromInputSelector);
      await page.click(fromInputSelector);
      log('Clicked on departure input');
      
      await page.type(fromInputSelector, DEPARTURE_TEXT);
      log(`Typed departure text: ${DEPARTURE_TEXT}`);
      
      await wait(2000);
      
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'departure_dropdown.png') });
      
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
            element.click();
          } else {
            throw new Error(`Element with XPath ${xpath} not found`);
          }
        }, DEPARTURE_XPATH);
        
        log(`Clicked on departure dropdown item with XPath: ${DEPARTURE_XPATH}`);
      } catch (error) {
        log(`Error clicking departure dropdown: ${error.message}`);
        await page.evaluate(() => {
          const items = document.querySelectorAll('.dropdown-item');
          if (items.length > 0) items[0].click();
        });
        log('Attempted to click first dropdown item as fallback');
      }
      
      await wait(1000);
      
      const toInputSelector = '#toTrainInput';
      await page.waitForSelector(toInputSelector);
      await page.click(toInputSelector);
      log('Clicked on arrival input');
      
      await page.type(toInputSelector, ARRIVAL_TEXT);
      log(`Typed arrival text: ${ARRIVAL_TEXT}`);
      
      await wait(2000);
      
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'arrival_dropdown.png') });
      
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
            element.click();
          } else {
            throw new Error(`Element with XPath ${xpath} not found`);
          }
        }, ARRIVAL_XPATH);
        
        log(`Clicked on arrival dropdown item with XPath: ${ARRIVAL_XPATH}`);
      } catch (error) {
        log(`Error clicking arrival dropdown: ${error.message}`);
        await page.evaluate(() => {
          const items = document.querySelectorAll('.dropdown-item');
          if (items.length > 0) items[0].click();
        });
        log('Attempted to click first dropdown item as fallback');
      }
      
      await wait(1000);
      
      try {
        await page.evaluate(() => {
          const labels = Array.from(document.querySelectorAll('label'));
          
          const dateLabel = labels.find(label => 
            label.textContent && label.textContent.includes('Gidiş Tarihi')
          );
          
          if (dateLabel) {
            dateLabel.click();
            console.log("Clicked on 'Gidiş Tarihi' label");
          } else {
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
        
        await wait(1500);
        
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'calendar_open.png') });
        
        await page.evaluate(() => {
          const dateCell = document.querySelector('td[data-date="2025-03-29"]');
          
          if (dateCell) {
            dateCell.click();
            console.log("Selected date using data-date attribute");
            return;
          }
          
          const monthHeaders = Array.from(document.querySelectorAll('.datepicker-switch, .month-heading, .calendar-header'));
          const marchHeader = monthHeaders.find(el => 
            el.textContent && (el.textContent.includes('Mart 2025') || el.textContent.includes('March 2025'))
          );
          
          if (marchHeader) {
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
          
          const prevButtons = document.querySelectorAll('.prev, .previous, .prev-month');
          const nextButtons = document.querySelectorAll('.next, .next-month');
          
          const currentMonthText = document.querySelector('.datepicker-switch, .month-heading, .calendar-header');
          if (currentMonthText) {
            const currentText = currentMonthText.textContent || '';
            
            if (!currentText.includes('Mart 2025') && !currentText.includes('March 2025')) {
              if (nextButtons.length > 0) {
                for (let i = 0; i < 12; i++) {
                  nextButtons[0].click();
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
        
        await wait(1000);
        
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'after_date_selection.png') });
      } catch (error) {
        log(`Error selecting date: ${error.message}. Will try to continue without date selection.`);
      }
      
      const searchButtonSelector = '#searchSeferButton';
      await page.waitForSelector(searchButtonSelector);
      await page.click(searchButtonSelector);
      log('Clicked search button');
      
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'after_search.png') });
      
      const targetSelector = '#gidis0btn > div > div:nth-child(3) > div > div > span';
      await page.waitForSelector(targetSelector, { timeout: 30000 });
      
      const currentValue = await page.$eval(targetSelector, el => el.textContent.trim());
      
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const screenshotPath = path.join(SCREENSHOT_DIR, `tcdd_${timestamp}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      
      if (lastValue === null) {
        log(`Initial value detected: "${currentValue}"`);
        lastValue = currentValue;
        
        if (currentValue !== INITIAL_VALUE) {
          log(`⚠️ ATTENTION! Value "${currentValue}" is different from expected initial value "${INITIAL_VALUE}"`);
          playAlertSound();
          showNotification(`Bilet durumu: ${currentValue}`);
        }
      } else if (currentValue !== lastValue) {
        log(`⚠️ VALUE CHANGED! Previous: "${lastValue}" -> Current: "${currentValue}"`);
        
        playAlertSound();
        showNotification(`Bilet durumu değişti: ${currentValue}`);
        
        lastValue = currentValue;
      } else {
        log(`No change detected. Current value: "${currentValue}"`);
        
        if (currentValue !== INITIAL_VALUE) {
          log(`⚠️ ATTENTION! Value "${currentValue}" is still different from expected initial value "${INITIAL_VALUE}"`);
          playAlertSound();
          showNotification(`Bilet durumu hala farklı: ${currentValue}`);
        }
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