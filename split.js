const fs = require('fs');
const path = require('path');

const originalFile = path.join(__dirname, 'riplay.html');
const content = fs.readFileSync(originalFile, 'utf8');

// Use regex to locate boundaries
const cssMatch = content.match(/<style>([\s\S]*?)<\/style>/);
const jsMatch = content.match(/<script>([\s\S]*?)<\/script>/);

if (!cssMatch || !jsMatch) {
  console.error("Could not find style or script tags.");
  process.exit(1);
}

const cssContent = cssMatch[1].trim();
let jsContent = jsMatch[1].trim();

// Remove the G constant from the new JS (we will use API instead)
const gRegex = /const G\s*=\s*\[[\s\S]*?\];/;
jsContent = jsContent.replace(gRegex, `let G = [];

// Fetch data from backend API
async function fetchGames() {
  try {
    const res = await fetch('/api/games');
    G = await res.json();
    
    // Resume app logic
    const ci = setInterval(()=>{
      c++;
      document.getElementById('statCount').textContent=String(Math.min(c, G.length)).padStart(3,'0');
      document.getElementById('landCount').textContent=\`Loading — \${String(Math.min(c, G.length)).padStart(3,'0')} / \${String(G.length).padStart(3,'0')}\`;
      if(c>=G.length)clearInterval(ci);
    },100);
  } catch (err) {
    console.error('Failed to load games data:', err);
    document.getElementById('landCount').textContent = 'Error Loading Data';
  }
}
fetchGames();
`);

// The original counter logic is out of date now, remove the old setInterval chunk.
jsContent = jsContent.replace(/let c=0;\nconst ci=setInterval\(\(\)=>\{\n[\s\S]*?\},100\);/m, 'let c=0;');

// Now prepare HTML
let htmlContent = content.replace(/<style>[\s\S]*?<\/style>/, '<link rel="stylesheet" href="/css/style.css">');
htmlContent = htmlContent.replace(/<script>[\s\S]*?<\/script>/, '<script src="/js/script.js" defer></script>');

// Make folders
function mk(dir) {
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }
}
mk(path.join(__dirname, 'public', 'css'));
mk(path.join(__dirname, 'public', 'js'));

// Write files
fs.writeFileSync(path.join(__dirname, 'public', 'css', 'style.css'), cssContent);
fs.writeFileSync(path.join(__dirname, 'public', 'js', 'script.js'), jsContent);
fs.writeFileSync(path.join(__dirname, 'public', 'index.html'), htmlContent);

console.log("Extraction complete! Added fetch logic to script.js.");
