const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const cron = require('node-cron');
const { scrapeSteamDB } = require('./scraper'); // Keeping as fallback or for specialized data

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, 'public')));

// API Endpoint to get all games data
app.get('/api/games', (req, res) => {
  const dataPath = path.join(__dirname, 'data', 'games.json');
  fs.readFile(dataPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading data:', err);
      return res.status(500).json({ error: 'Failed to read database' });
    }
    res.json(JSON.parse(data));
  });
});

// --- DISCOVERY HUB V1 API ---

// 1. Search - Search local DB or Steam API
app.get('/api/v1/search', async (req, res) => {
  const q = req.query.q ? req.query.q.toLowerCase() : '';
  const dataPath = path.join(__dirname, 'data', 'games.json');
  
  try {
    const rawData = fs.readFileSync(dataPath, 'utf8');
    const games = JSON.parse(rawData);
    
    // Search local first
    const localMatches = games.filter(g => 
      g.t.toLowerCase().includes(q) || 
      (g.tags && g.tags.some(t => t.toLowerCase().includes(q)))
    );
    
    if (localMatches.length > 0 || !process.env.STEAM_API_KEY) {
      return res.json(localMatches);
    }

    // If no local matches, search Steam (limited to first 5 results to avoid lag)
    console.log(`[API] No local match for "${q}", searching Steam...`);
    const steamSearchRes = await axios.get(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(q)}&l=english&cc=US`);
    
    if (steamSearchRes.data && steamSearchRes.data.items) {
      const results = steamSearchRes.data.items.map(item => ({
        id: `steam_${item.id}`,
        t: item.name,
        e: "🔍",
        appId: item.id,
        bg: "linear-gradient(135deg,#1a1a2e,#16213e)",
        p: "Steam",
        r: 0,
        tags: (item.categories || []).map(c => c.name),
        playersCurrent: 0,
        price: item.price ? `$${(item.price.final / 100).toFixed(2)}` : "Free",
        status: "steam_result"
      }));
      return res.json(results);
    }

    res.json([]);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// 2. Charts - Top games by current player count
app.get('/api/v1/charts', (req, res) => {
  const dataPath = path.join(__dirname, 'data', 'games.json');
  fs.readFile(dataPath, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Read error' });
    const games = JSON.parse(data);
    const sorted = games.sort((a,b) => (b.playersCurrent || 0) - (a.playersCurrent || 0));
    res.json(sorted);
  });
});

// 3. Sales - Games with active discounts
app.get('/api/v1/sales', (req, res) => {
  const dataPath = path.join(__dirname, 'data', 'games.json');
  fs.readFile(dataPath, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Read error' });
    const games = JSON.parse(data);
    const sales = games.filter(g => g.lowestDiscount && g.lowestDiscount !== 'N/A' && g.lowestDiscount !== '0%');
    res.json(sales);
  });
});

// 4. Calendar - Group games by release date
app.get('/api/v1/calendar', (req, res) => {
  const dataPath = path.join(__dirname, 'data', 'games.json');
  fs.readFile(dataPath, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Read error' });
    const games = JSON.parse(data);
    const sorted = games.sort((a,b) => new Date(b.releaseDate) - new Date(a.releaseDate));
    res.json(sorted);
  });
});

// 5. Tags - Aggregate all unique tags with count
app.get('/api/v1/tags', (req, res) => {
  const dataPath = path.join(__dirname, 'data', 'games.json');
  fs.readFile(dataPath, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Read error' });
    const games = JSON.parse(data);
    const tagMap = {};
    games.forEach(g => {
      (g.steamTags || []).forEach(t => {
        tagMap[t] = (tagMap[t] || 0) + 1;
      });
    });
    const tags = Object.entries(tagMap).map(([name, count]) => ({ name, count }))
                       .sort((a,b) => b.count - a.count);
    res.json(tags);
  });
});

// 6. Patches - Aggregate most recent patch notes
app.get('/api/v1/patches', (req, res) => {
  const dataPath = path.join(__dirname, 'data', 'games.json');
  fs.readFile(dataPath, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Read error' });
    const games = JSON.parse(data);
    const allPatches = [];
    games.forEach(g => {
      (g.patches || []).forEach(p => {
        allPatches.push({ gameId: g.id, gameTitle: g.t, emoji: g.e, ...p });
      });
    });
    allPatches.sort((a,b) => new Date(b.date) - new Date(a.date));
    res.json(allPatches);
  });
});

// Schedule the new sync logic to run automatically in the background every 12 hours
const { exec } = require('child_process');
cron.schedule('0 */12 * * *', () => {
  console.log('[Cron] Running scheduled sync job...');
  exec('node sync.js', (error, stdout, stderr) => {
    if (error) console.error(`[Sync Error] ${error.message}`);
    if (stderr) console.error(`[Sync Stderr] ${stderr}`);
    console.log(`[Sync Success] ${stdout}`);
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Steam API Sync Engine Scheduled: Will sync with Steam every 12 hours.`);
});
