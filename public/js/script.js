// ── FIREBASE CONFIGURATION ──
const firebaseConfig = {
  apiKey: "AIzaSyDfAXJ__p5bERxJd3yevqzTS5TfsAU-GMk",
  authDomain: "riplay-65b8b.firebaseapp.com",
  projectId: "riplay-65b8b",
  storageBucket: "riplay-65b8b.firebasestorage.app",
  messagingSenderId: "487870278981",
  appId: "1:487870278981:web:d55da158d9503c5d80a22c",
  measurementId: "G-BXK77EB9LP"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const analytics = firebase.analytics();

// ── AUTH LOGIC ──
let authMode = 'login';
const authBtn = document.getElementById('authBtn');
const emailInput = document.getElementById('email');
const passInput = document.getElementById('password');
const authErr = document.getElementById('authError');

function setAuthMode(mode) {
  authMode = mode;
  document.getElementById('tabLogin').classList.toggle('act', mode === 'login');
  document.getElementById('tabSignup').classList.toggle('act', mode === 'signup');
  authBtn.textContent = mode === 'login' ? 'Initialize Access' : 'Create Account';
  authErr.style.display = 'none';
}

if (authBtn) {
  authBtn.addEventListener('click', async () => {
    const email = emailInput.value;
    const pass = passInput.value;
    if (!email || !pass) {
      showAuthError("Please provide both email and security key.");
      return;
    }
    
    authBtn.textContent = 'Processing...';
    authBtn.disabled = true;

    try {
      if (authMode === 'login') {
        await auth.signInWithEmailAndPassword(email, pass);
        proceedToApp();
      } else {
        const userCredential = await auth.createUserWithEmailAndPassword(email, pass);
        const user = userCredential.user;
        
        // Save User Details to Firestore
        await db.collection('users').doc(user.uid).set({
          uid: user.uid,
          email: user.email,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          role: 'user',
          lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        proceedToApp();
      }
    } catch (error) {
      showAuthError(error.message);
      authBtn.textContent = authMode === 'login' ? 'Initialize Access' : 'Create Account';
      authBtn.disabled = false;
    }
  });
}

function showAuthError(msg) {
  authErr.textContent = `[System Error]: ${msg}`;
  authErr.style.display = 'block';
}

function skipAuth() {
  proceedToApp();
}

function proceedToApp() {
  document.getElementById('auth').style.display = 'none';
  document.getElementById('land').style.display = 'grid';
  fetchGames(); 
}

// ── APP LOGIC ──
const cur=document.getElementById('cur'),curR=document.getElementById('curR');
let mx=0,my=0,rx=0,ry=0;
document.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;if(cur)cur.style.left=mx+'px';if(cur)cur.style.top=my+'px'});
(function a(){rx+=(mx-rx)*.12;ry+=(my-ry)*.12;if(curR){curR.style.left=rx+'px';curR.style.top=ry+'px';}requestAnimationFrame(a)})();

function enter(){
  const l=document.getElementById('land'),h=document.getElementById('home');
  l.classList.add('out');
  setTimeout(()=>{l.style.display='none';h.style.display='block';setTimeout(()=>{h.classList.add('vis');showView('home')},20)},750);
}

let G = [];
let displayLimit = 30; 
let mood='all',genre='all',q='';
const mT={all:'All Games',chill:'Chill & Cozy',action:'Action-Packed',story:'Story-Driven',social:'Multiplayer'};

async function fetchGames() {
  try {
    const res = await fetch('/api/games');
    G = await res.json();
    const sEl = document.getElementById('statCount');
    if (sEl) sEl.textContent = String(G.length).padStart(3, '0');
    renderFeatured();
    renderGames();
  } catch (err) {
    console.error('Failed to load games data:', err);
  }
}

function renderFeatured() {
  if (!G.length) return;
  const f = G[0]; 
  const featEl = document.getElementById('feat');
  if (!featEl) return;
  featEl.querySelector('.feat-title').innerHTML = f.t.split(' ').join('<br>');
  featEl.querySelector('.feat-desc').textContent = f.d;
  featEl.querySelector('.feat-emoji-big').textContent = f.e;
  featEl.querySelector('.feat-actions').innerHTML = `<button class="btn-solid" onclick="openM('${f.id}')">View Full Details →</button>`;
}

function showView(viewId) {
  // Toggle active view container
  document.querySelectorAll('.view').forEach(v => v.classList.remove('act'));
  document.getElementById('view-' + viewId)?.classList.add('act');
  
  // Highlight active link in navigation
  document.querySelectorAll('.nav-links a').forEach(a => {
    const isAct = a.getAttribute('onclick')?.includes(`'${viewId}'`);
    a.classList.toggle('act', !!isAct);
  });

  // Reset page scroll position
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Load view-specific content
  if (viewId === 'home') {
    renderGames();
  } else if (viewId === 'charts') {
    loadChartsView();
  } else if (viewId === 'sales') {
    loadSalesView();
  } else if (viewId === 'calendar') {
    loadCalendarView();
  } else if (viewId === 'patches') {
    loadPatchesView();
  } else if (viewId === 'tags') {
    loadTagsView();
  }
}

// ── HUB / CHARTS VIEW ──
let chartsData = [];
async function loadChartsView() {
  const container = document.getElementById('charts-content');
  if (!container) return;
  container.innerHTML = '<div class="nr">// INITIALIZING_CHARTS...</div>';
  try {
    const res = await fetch('/api/v1/charts');
    chartsData = await res.json();
    renderCharts(chartsData);
  } catch (err) {
    console.error('Failed to load charts:', err);
    container.innerHTML = '<div class="nr">// ERROR_CHARTS_FAIL</div>';
  }
}

function renderCharts(data) {
  const container = document.getElementById('charts-content');
  if (!container) return;
  if (!data || !data.length) {
    container.innerHTML = '<div class="nr">// NO_CHARTS_DATA</div>';
    return;
  }
  container.innerHTML = `
    <div class="hub-container">
      <table class="hub-table">
        <thead>
          <tr>
            <th class="rank-col">Rank</th>
            <th>Game</th>
            <th>Current Players</th>
            <th>24h Peak</th>
            <th>Platforms</th>
            <th>Price</th>
          </tr>
        </thead>
        <tbody>
          ${data.map((g, i) => `
            <tr onclick="openM('${g.id}')" style="cursor: pointer;">
              <td class="rank-col">#${String(i + 1).padStart(2, '0')}</td>
              <td>
                <div class="game-col">
                  <span class="game-emoji">${g.e || '🎮'}</span>
                  <span style="font-weight: 500;">${g.t}</span>
                </div>
              </td>
              <td>${(g.playersCurrent || 0).toLocaleString()}</td>
              <td>${(g.players24hPeak || 0).toLocaleString()}</td>
              <td>${g.platforms ? g.platforms.join(', ') : 'PC'}</td>
              <td class="price-col">${g.price || 'Free'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function filterCharts(val) {
  const filtered = chartsData.filter(g => 
    g.t.toLowerCase().includes(val.toLowerCase()) || 
    (g.tags && g.tags.some(t => t.toLowerCase().includes(val.toLowerCase())))
  );
  renderCharts(filtered);
}

// ── SALES / DISCOUNTS VIEW ──
let salesData = [];
async function loadSalesView() {
  const container = document.getElementById('sales-content');
  if (!container) return;
  container.innerHTML = '<div class="nr">// SCANNING_DISCOUNTS...</div>';
  try {
    const res = await fetch('/api/v1/sales');
    salesData = await res.json();
    renderSales(salesData);
  } catch (err) {
    console.error('Failed to load sales:', err);
    container.innerHTML = '<div class="nr">// ERROR_SALES_FAIL</div>';
  }
}

function renderSales(data) {
  const container = document.getElementById('sales-content');
  if (!container) return;
  if (!data || !data.length) {
    container.innerHTML = '<div class="nr">// NO_ACTIVE_DISCOUNTS_IN_DB</div>';
    return;
  }
  container.innerHTML = `
    <div class="hub-container">
      <table class="hub-table">
        <thead>
          <tr>
            <th>Game</th>
            <th>Discount</th>
            <th>Current Price</th>
            <th>Original Price</th>
            <th>Rating</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(g => `
            <tr onclick="openM('${g.id}')" style="cursor: pointer;">
              <td>
                <div class="game-col">
                  <span class="game-emoji">${g.e || '🎮'}</span>
                  <span style="font-weight: 500;">${g.t}</span>
                </div>
              </td>
              <td><span class="discount-badge">${g.lowestDiscount}</span></td>
              <td class="price-col">${g.price || 'Free'}</td>
              <td style="text-decoration: line-through; color: var(--sub); font-family: 'JetBrains Mono', monospace; font-size: 11px;">${g.lowestPrice || 'N/A'}</td>
              <td>★ ${g.r || 4.0}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function filterSales(val) {
  const filtered = salesData.filter(g => 
    g.t.toLowerCase().includes(val.toLowerCase()) || 
    (g.tags && g.tags.some(t => t.toLowerCase().includes(val.toLowerCase())))
  );
  renderSales(filtered);
}

// ── CALENDAR VIEW ──
let calendarData = [];
async function loadCalendarView() {
  const container = document.getElementById('calendar-content');
  if (!container) return;
  container.innerHTML = '<div class="nr">// COMPUTING_TIMELINES...</div>';
  try {
    const res = await fetch('/api/v1/calendar');
    calendarData = await res.json();
    renderCalendar(calendarData);
  } catch (err) {
    console.error('Failed to load calendar:', err);
    container.innerHTML = '<div class="nr">// ERROR_CALENDAR_FAIL</div>';
  }
}

function renderCalendar(data) {
  const container = document.getElementById('calendar-content');
  if (!container) return;
  if (!data || !data.length) {
    container.innerHTML = '<div class="nr">// NO_RELEASES_AVAILABLE</div>';
    return;
  }

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const groups = {};
  const groupOrder = [];

  data.forEach(g => {
    let groupKey = "TBA / Other";
    const date = new Date(g.releaseDate);
    if (!isNaN(date.getTime())) {
      groupKey = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    } else if (g.releaseDate && g.releaseDate !== "TBA") {
      const match = g.releaseDate.match(/\b(20\d\d)\b/);
      if (match) {
        groupKey = g.releaseDate;
      }
    }
    if (!groups[groupKey]) {
      groups[groupKey] = [];
      groupOrder.push(groupKey);
    }
    groups[groupKey].push(g);
  });

  container.innerHTML = `
    <div class="calendar-grid">
      ${groupOrder.map(groupKey => `
        <div class="cal-month-section">
          <div class="cal-month-title">${groupKey}</div>
          <div class="cal-cards">
            ${groups[groupKey].map(g => `
              <div class="cal-card" onclick="openM('${g.id}')" style="cursor: pointer;">
                <div class="cal-date">${g.releaseDate || 'TBA'}</div>
                <div class="cal-title">${g.t}</div>
                <div class="gc-tags" style="margin-top: 8px;">
                  ${g.tags ? g.tags.slice(0, 2).map(t => `<span class="gc-tag">${t}</span>`).join('') : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function filterCalendar(val) {
  const filtered = calendarData.filter(g => 
    g.t.toLowerCase().includes(val.toLowerCase()) || 
    (g.tags && g.tags.some(t => t.toLowerCase().includes(val.toLowerCase())))
  );
  renderCalendar(filtered);
}

// ── PATCHES VIEW ──
let patchesData = [];
async function loadPatchesView() {
  const container = document.getElementById('patches-content');
  if (!container) return;
  container.innerHTML = '<div class="nr">// RETRIEVING_PATCH_CHANGELOGS...</div>';
  try {
    const res = await fetch('/api/v1/patches');
    patchesData = await res.json();
    renderPatches(patchesData);
  } catch (err) {
    console.error('Failed to load patches:', err);
    container.innerHTML = '<div class="nr">// ERROR_PATCHES_FAIL</div>';
  }
}

function renderPatches(data) {
  const container = document.getElementById('patches-content');
  if (!container) return;
  if (!data || !data.length) {
    container.innerHTML = '<div class="nr">// NO_RECENT_UPDATES</div>';
    return;
  }
  container.innerHTML = `
    <div class="patch-list">
      ${data.map(p => `
        <div class="patch-card" onclick="openM('${p.gameId}')" style="cursor: pointer;">
          <div class="patch-meta">
            <span class="p-game">${p.emoji || '🎮'} ${p.gameTitle}</span>
            <span class="p-date">${p.date}</span>
          </div>
          <div class="p-title">${p.title}</div>
          <div class="p-snip" style="margin-bottom: 12px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">
            Click to view full game details and statistics.
          </div>
          <a href="${p.url}" target="_blank" onclick="event.stopPropagation();" class="gc-btn" style="display: inline-block; text-decoration: none; padding: 4px 8px; font-size: 10px;">Official Notes ↗</a>
        </div>
      `).join('')}
    </div>
  `;
}

function filterPatches(val) {
  const filtered = patchesData.filter(p => 
    p.gameTitle.toLowerCase().includes(val.toLowerCase()) || 
    p.title.toLowerCase().includes(val.toLowerCase())
  );
  renderPatches(filtered);
}

// ── TAGS VIEW ──
let tagsData = [];
async function loadTagsView() {
  const container = document.getElementById('tags-content');
  if (!container) return;
  container.innerHTML = '<div class="nr">// COMPILING_POPULAR_TAGS...</div>';
  try {
    const res = await fetch('/api/v1/tags');
    tagsData = await res.json();
    renderTags(tagsData);
  } catch (err) {
    console.error('Failed to load tags:', err);
    container.innerHTML = '<div class="nr">// ERROR_TAGS_FAIL</div>';
  }
}

function renderTags(data) {
  const container = document.getElementById('tags-content');
  if (!container) return;
  if (!data || !data.length) {
    container.innerHTML = '<div class="nr">// NO_TAGS_FOUND</div>';
    return;
  }
  container.innerHTML = `
    <div class="tag-explorer">
      ${data.map(t => `
        <div class="tag-item" onclick="filterByTag('${t.name}')" style="cursor: pointer;">
          <span class="tag-name">${t.name}</span>
          <span class="tag-count">${t.count}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function filterTags(val) {
  const filtered = tagsData.filter(t => 
    t.name.toLowerCase().includes(val.toLowerCase())
  );
  renderTags(filtered);
}

function filterByTag(tagName) {
  const sInput = document.getElementById('srch');
  if (sInput) sInput.value = tagName;
  q = tagName.toLowerCase();
  showView('home');
  renderGames();
  document.getElementById('games')?.scrollIntoView({ behavior: 'smooth' });
}

// ── GLOBAL SEARCH ──
function hs(val) {
  q = val.toLowerCase();
  renderGames();
}

function renderGames(){
  const grid=document.getElementById('gg');
  if (!grid) return;
  const filtered=G.filter(g=>(mood==='all'||g.mood.includes(mood))&&(genre==='all'||g.g===genre)&&(!q||g.t.toLowerCase().includes(q)||g.d.toLowerCase().includes(q)||g.tags.some(t=>t.toLowerCase().includes(q))));
  const f = filtered.slice(0, displayLimit);
  if(!f.length){grid.innerHTML='<div class="nr">// NO_GAMES_FOUND</div>';return;}
  grid.innerHTML=f.map((g,i)=>`
    <div class="gc" style="animation-delay:${i*.02}s" onclick="openM('${g.id}')">
      <div class="gc-thumb" style="background:${g.bg}">
        <img src="https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appId}/header.jpg" style="width:100%;height:100%;object-fit:cover;opacity:0.85;position:absolute;inset:0;transition:opacity 0.3s;" onerror="this.style.display='none'" onload="this.style.opacity='1'" class="gc-img">
        <span class="gc-plat">${g.p}</span>
      </div>
      <div class="gc-body">
        <div class="gc-tags">${g.tags.slice(0,3).map(t=>`<span class="gc-tag">${t}</span>`).join('')}</div>
        <div class="gc-title">${g.t}</div>
        <p class="gc-desc">${g.d.substring(0, 80)}...</p>
        <div class="gc-foot"><div class="gc-rating">★ ${g.r}</div><button class="gc-btn" onclick="event.stopPropagation();openM('${g.id}')">Details ↗</button></div>
      </div>
    </div>`).join('');
}

function setM(m,el){mood=m;document.querySelectorAll('.mood-btn').forEach(b=>b.classList.remove('act'));el.classList.add('act');document.getElementById('stit').textContent=mT[m];renderGames()}
function setG(g,el){genre=g;document.querySelectorAll('.gt').forEach(t=>t.classList.remove('act'));el.classList.add('act');renderGames()}

function openM(id){
  const g=G.find(x=>x.id===id); if(!g)return;
  
  // Set modal header background to the game's high-res library background
  document.getElementById('mh').style.background = `url('https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appId}/library_hero.jpg') center/cover, ${g.bg}`;
  document.getElementById('mh').style.backgroundBlendMode = 'overlay';
  
  document.getElementById('mAppId').textContent=`APP ID: ${g.appId}`;
  document.getElementById('mStatus').innerHTML=`<span class="st-dot" style="background:var(--acc)"></span>RELEASED`;
  document.getElementById('mtit').textContent=g.t;
  document.getElementById('mSubtitle').textContent=`${g.developer} · ${g.releaseDate} · ${g.platforms.join(', ')}`;

  document.getElementById('tab-overview').innerHTML=`
    <div class="m-sec-title">Live Player Stats</div>
    <div class="m-live-stats">
      <div class="m-live-stat"><div class="m-live-num" style="color:var(--acc)">${(g.playersCurrent || 0).toLocaleString()}</div><div class="m-live-label">Playing Now</div></div>
      <div class="m-live-stat"><div class="m-live-num" style="color:var(--acc2)">${(g.players24hPeak || 0).toLocaleString()}</div><div class="m-live-label">24h Peak</div></div>
      <div class="m-live-stat"><div class="m-live-num" style="color:var(--acc3)">${(g.playersAllTimePeak || 0).toLocaleString()}</div><div class="m-live-label">All-Time Peak</div></div>
    </div>
    <div class="m-sec-title">About</div>
    <div class="m-desc-full">${g.ld}</div>
  `;

  document.getElementById('tab-stats').innerHTML=`
    <div class="m-sec-title">Community Metrics</div>
    <div class="m-live-stats">
      <div class="m-live-stat"><div class="m-live-num">${g.reviews?.positive || 90}%</div><div class="m-live-label">Positive Reviews</div></div>
      <div class="m-live-stat"><div class="m-live-num">${g.achievements || 0}</div><div class="m-live-label">Total Achievements</div></div>
      <div class="m-live-stat"><div class="m-live-num">#${g.store?.dau || 'N/A'}</div><div class="m-live-label">Daily Players Rank</div></div>
    </div>
  `;

  document.getElementById('tab-patches').innerHTML=`
    <div class="m-sec-title">Recent Updates & Patches</div>
    <div class="m-updates">
      ${g.patches && g.patches.length ? g.patches.map(p => `
        <a href="${p.url}" target="_blank" class="m-update-item" style="text-decoration:none;display:block;">
          <div class="m-update-dot"></div>
          <div class="m-update-date">${p.date}</div>
          <div class="m-update-text">${p.title}</div>
        </a>
      `).join('') : '<div class="nr">No recent patches found.</div>'}
    </div>
  `;

  document.getElementById('mo').classList.add('open');
  document.body.style.overflow='hidden';
}

function closeM(e){
  if(e && e.target!==document.getElementById('mo') && !e.target.classList.contains('mc2')) return;
  document.getElementById('mo').classList.remove('open');document.body.style.overflow='';
}

function switchTab(tabId,el){
  document.querySelectorAll('.m-tab').forEach(t=>t.classList.remove('act'));
  document.querySelectorAll('.m-tab-content').forEach(t=>t.classList.remove('act'));
  el.classList.add('act');
  document.getElementById('tab-'+tabId).classList.add('act');
}