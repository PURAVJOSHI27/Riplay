const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, 'data', 'games.json');

// Scrape live data realistically from SteamDB using headless Chrome
async function scrapeSteamDB() {
  console.log('[Scraper] Starting background SteamDB scrape...');
  
  // Read our current database
  let rawData = fs.readFileSync(dataPath, 'utf8');
  let games = JSON.parse(rawData);
  
  let browser;
  try {
    // Launch an invisible Chrome browser
    browser = await puppeteer.launch({ 
      headless: "new",
      // Important to bypass generic bot detection
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    const page = await browser.newPage();
    
    // Camouflage the bot
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');

    for (let game of games) {
      if (!game.appId || game.appId === "N/A") continue;
      
      console.log(`[Scraper] Fetching data for: ${game.t}...`);
      
      try {
        await page.goto(`https://steamdb.info/app/${game.appId}/charts/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        // Wait for the numbers to render. If cloudflare blocks us, this will timeout.
        await page.waitForSelector('.header-thing-number', { timeout: 10000 }).catch(() => null);

        // Extract numbers from the page using DOM manipulation inside the browser context
        const stats = await page.evaluate(() => {
          const numbers = Array.from(document.querySelectorAll('.header-thing-number')).map(el => el.innerText.replace(/,/g, ''));
          return {
            currentPlayers: parseInt(numbers[0]) || null,
            peak24h: parseInt(numbers[1]) || null,
            peakAllTime: parseInt(numbers[2]) || null
          };
        });

        if (stats.currentPlayers) {
          game.playersCurrent = stats.currentPlayers;
          game.players24hPeak = stats.peak24h;
          game.playersAllTimePeak = stats.peakAllTime;
          console.log(`[Scraper] SUCCESS: ${game.t} has ${stats.currentPlayers} players.`);
        } else {
          console.log(`[Scraper] WARN: Could not find accurate stats for ${game.t} (Bot protection restricted page)`);
        }
        
      } catch (e) {
         console.log(`[Scraper] ERR: Nav failed for ${game.t}.`);
      }
      
      // Crucial: Wait a random amount of time between 3 and 7 seconds before checking the next game
      // This prevents SteamDB from immediately banning our IP for spamming requests.
      const delay = Math.floor(Math.random() * 4000) + 3000;
      await new Promise(r => setTimeout(r, delay));
    }
    
    // Save updated data back to games.json
    fs.writeFileSync(dataPath, JSON.stringify(games, null, 2));
    console.log('[Scraper] Database strictly updated. Scraping complete.');

  } catch (err) {
    console.error('[Scraper] FATAL ERROR:', err);
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { scrapeSteamDB };
