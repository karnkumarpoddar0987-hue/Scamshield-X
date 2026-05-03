const API = 'http://localhost:3000/api';


let currentPage = 'landing';
let mapInitialized = false;
let scamMap = null;
let simScenarios = [];
let currentScenarioIndex = 0;
let totalSimScore = 0;
let scamTrendChart = null;
let scamTypeChart = null;
let radarTypeChart = null;

function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  const navEl = document.getElementById('nav-' + page);
  if (navEl) navEl.classList.add('active');
  currentPage = page;
  window.scrollTo(0, 0);
  if (page === 'radar' && !mapInitialized) initMap();
  if (page === 'dashboard') initDashboardCharts();
  if (page === 'simulator') loadScenarios();
  if (page === 'report') loadRecentReports();
  if (page === 'assistant') initSafetyTips();
}

function closePopup() {
  document.getElementById('scam-alert-popup').classList.add('hidden');
}

function showScamPopup(msg, score) {
  document.getElementById('popup-msg').textContent = msg;
  document.getElementById('popup-score').textContent = 'Risk Score: ' + score + '%';
  document.getElementById('scam-alert-popup').classList.remove('hidden');
  setTimeout(() => document.getElementById('scam-alert-popup').classList.add('hidden'), 8000);
}

async function analyzeCall() {
  const transcript = document.getElementById('call-transcript').value.trim();
  const phone = document.getElementById('call-phone').value.trim();
  if (!transcript) { alert('Please enter call transcript'); return; }
  const btn = document.getElementById('btn-analyze-call');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
  btn.disabled = true;
  try {
    const res = await fetch(API + '/analyze/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, phoneNumber: phone })
    });
    const data = await res.json();
    const box = document.getElementById('call-result');
    box.classList.remove('hidden');
    box.style.borderColor = data.color;
    box.innerHTML = `
      <div class="result-score" style="color:${data.color}">${data.fraudProbability}%</div>
      <div class="result-level" style="color:${data.color}">${data.riskLevel}</div>
      <div class="result-detail">Deepfake Analysis: <strong style="color:${data.deepfake.score > 70 ? '#ff0040' : '#00ff88'}">${data.deepfake.verdict}</strong> (${data.deepfake.score}% synthetic probability)</div>
      ${data.warnings.length ? '<div class="result-tags">' + data.warnings.map(w => '<span class="result-tag">' + w + '</span>').join('') + '</div>' : ''}
      ${data.detectedKeywords.length ? '<div class="result-detail" style="margin-top:8px">Scam keywords: <strong style="color:#ff6688">' + data.detectedKeywords.slice(0, 5).join(', ') + '</strong></div>' : ''}
      ${data.trustScore ? '<div class="result-detail" style="margin-top:8px">Caller Trust Score: <strong style="color:' + data.trustScore.color + '">' + data.trustScore.score + '/100 — ' + data.trustScore.verdict + '</strong></div>' : ''}
      <div class="result-rec">${data.recommendation}</div>
    `;
    if (data.fraudProbability >= 70) showScamPopup(data.recommendation, data.fraudProbability);
    addToThreatFeed(data);
  } catch (e) {
    console.error('analyzeCall error:', e);
    alert('Connection error. Make sure server is running on port 3000.');
  }
  btn.innerHTML = '<i class="fas fa-brain"></i> Analyze Call';
  btn.disabled = false;
}

async function analyzeDeepfake() {
  const text = document.getElementById('voice-text').value.trim();
  if (!text) { alert('Please enter voice transcript'); return; }
  const btn = document.getElementById('btn-analyze-deepfake');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
  btn.disabled = true;
  try {
    const res = await fetch(API + '/analyze/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: text })
    });
    const data = await res.json();
    const box = document.getElementById('deepfake-result');
    box.classList.remove('hidden');
    const dfColor = data.deepfake.score > 70 ? '#ff0040' : data.deepfake.score > 40 ? '#ffcc00' : '#00ff88';
    box.style.borderColor = dfColor;
    box.innerHTML = `
      <div class="result-score" style="color:${dfColor}">${data.deepfake.score}%</div>
      <div class="result-level" style="color:${dfColor}">${data.deepfake.verdict}</div>
      <div class="result-detail">${data.deepfake.score > 70 ? 'High probability of AI-generated synthetic voice detected.' : data.deepfake.score > 40 ? 'Voice patterns show some anomalies. Proceed with caution.' : 'Voice patterns appear natural and authentic.'}</div>
      <div class="result-detail">Fraud probability: <strong style="color:${data.color}">${data.fraudProbability}% — ${data.riskLevel}</strong></div>
      <div class="result-rec">${data.recommendation}</div>
    `;
    animateWaveform(data.deepfake.score);
  } catch (e) {
    console.error('analyzeDeepfake error:', e);
    alert('Connection error. Make sure server is running on port 3000.');
  }
  btn.innerHTML = '<i class="fas fa-waveform-lines"></i> Analyze Voice';
  btn.disabled = false;
}

function animateWaveform(score) {
  const bars = document.querySelectorAll('.wave-bar');
  bars.forEach(bar => {
    const h = score > 70 ? Math.random() * 60 + 20 : Math.random() * 40 + 10;
    bar.style.height = h + 'px';
    bar.style.background = score > 70 ? 'linear-gradient(to top,#ff0040,#ff6688)' : score > 40 ? 'linear-gradient(to top,#ff6600,#ffcc00)' : 'linear-gradient(to top,#0066ff,#00ccff)';
  });
}

async function scanLink() {
  const url = document.getElementById('scan-url').value.trim();
  if (!url) { alert('Please enter a URL'); return; }
  const btn = document.getElementById('btn-scan-link');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scanning...';
  btn.disabled = true;
  try {
    const res = await fetch(API + '/analyze/link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    const data = await res.json();
    const box = document.getElementById('link-result');
    box.classList.remove('hidden');
    box.style.borderColor = data.color;
    box.innerHTML = `
      <div class="result-score" style="color:${data.color}">${data.riskScore}%</div>
      <div class="result-level" style="color:${data.color}">${data.verdict}</div>
      <div class="result-detail">Domain: <strong style="color:#fff">${data.domain}</strong></div>
      ${data.flags.length ? '<div class="result-tags">' + data.flags.map(f => '<span class="result-tag">' + f + '</span>').join('') + '</div>' : ''}
      <div class="result-rec">${data.recommendation}</div>
    `;
    if (data.riskScore >= 70) showScamPopup('Dangerous phishing link detected! ' + data.recommendation, data.riskScore);
  } catch (e) {
    console.error('scanLink error:', e);
    alert('Connection error. Make sure server is running on port 3000.');
  }
  btn.innerHTML = '<i class="fas fa-magnifying-glass"></i> Scan Link';
  btn.disabled = false;
}

async function scanText() {
  const text = document.getElementById('scan-text').value.trim();
  if (!text) { alert('Please enter message text'); return; }
  const btn = document.getElementById('btn-scan-text');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scanning...';
  btn.disabled = true;
  try {
    const res = await fetch(API + '/analyze/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    const data = await res.json();
    const box = document.getElementById('text-result');
    box.classList.remove('hidden');
    box.style.borderColor = data.color;
    box.innerHTML = `
      <div class="result-score" style="color:${data.color}">${data.fraudProbability}%</div>
      <div class="result-level" style="color:${data.color}">${data.riskLevel}</div>
      ${data.warnings.length ? '<div class="result-tags">' + data.warnings.map(w => '<span class="result-tag">' + w + '</span>').join('') + '</div>' : ''}
      ${data.detectedKeywords.length ? '<div class="result-detail" style="margin-top:8px">Detected: <strong style="color:#ff6688">' + data.detectedKeywords.slice(0, 6).join(', ') + '</strong></div>' : ''}
      <div class="result-rec">${data.recommendation}</div>
    `;
    if (data.fraudProbability >= 70) showScamPopup('Scam message detected! ' + data.recommendation, data.fraudProbability);
  } catch (e) {
    console.error('scanText error:', e);
    alert('Connection error. Make sure server is running on port 3000.');
  }
  btn.innerHTML = '<i class="fas fa-shield-halved"></i> Scan Message';
  btn.disabled = false;
}

async function checkTrust() {
  const phone = document.getElementById('trust-phone').value.trim();
  if (!phone) { alert('Please enter a phone number'); return; }
  const btn = document.getElementById('btn-check-trust');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';
  btn.disabled = true;
  try {
    const res = await fetch(API + '/trust-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: phone })
    });
    const data = await res.json();
    const box = document.getElementById('trust-result');
    box.classList.remove('hidden');
    box.style.borderColor = data.color;
    box.innerHTML = `
      <div class="trust-score-display">
        <div class="trust-circle" style="border-color:${data.color};color:${data.color}">${data.score}</div>
        <div class="result-level" style="color:${data.color}">${data.verdict}</div>
        <div class="result-detail">Fraud reports: <strong style="color:#fff">${data.reportCount}</strong></div>
        <div class="result-detail">Number age: <strong style="color:#fff">${data.ageMonths} months</strong></div>
        <div class="result-rec">${data.score >= 70 ? 'This number appears trustworthy.' : data.score >= 40 ? 'Exercise caution with this number.' : 'HIGH RISK — Multiple fraud reports. Do not engage.'}</div>
      </div>
    `;
  } catch (e) {
    console.error('checkTrust error:', e);
    alert('Connection error. Make sure server is running on port 3000.');
  }
  btn.innerHTML = '<i class="fas fa-search"></i> Check Trust Score';
  btn.disabled = false;
}

async function initMap() {
  mapInitialized = true;
  scamMap = L.map('scam-map', { zoomControl: true, attributionControl: false }).setView([22.5, 80.0], 5);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 18 }).addTo(scamMap);
  await loadRadarData();
  setInterval(loadRadarData, 30000);
}

async function loadRadarData() {
  try {
    const res = await fetch(API + '/radar/hotspots');
    const data = await res.json();
    document.getElementById('radar-total').textContent = data.total.toLocaleString();
    if (scamMap) {
      scamMap.eachLayer(layer => {
        if (layer instanceof L.CircleMarker || layer instanceof L.Marker) scamMap.removeLayer(layer);
      });
      data.hotspots.forEach(spot => {
        const color = spot.severity === 'high' ? '#ff0040' : spot.severity === 'medium' ? '#ff6600' : '#ffcc00';
        const radius = spot.severity === 'high' ? 30 : spot.severity === 'medium' ? 20 : 12;
        L.circleMarker([spot.lat, spot.lng], { radius, color, fillColor: color, fillOpacity: 0.3, weight: 2 })
          .addTo(scamMap)
          .bindPopup('<div style="background:#0a1628;color:#e0f0ff;padding:12px;border-radius:8px;min-width:180px"><strong style="color:#00ccff;font-size:15px">' + spot.city + '</strong><br><span style="color:#ff6688">' + spot.type + '</span><br><span style="color:#ffcc00">Reports: ' + spot.count + '</span><br><span style="color:#7aa0c0;font-size:12px">' + spot.time + '</span></div>');
        L.circleMarker([spot.lat, spot.lng], { radius: radius + 10, color, fillColor: 'transparent', fillOpacity: 0, weight: 1, opacity: 0.4 }).addTo(scamMap);
      });
    }
    const list = document.getElementById('hotspot-list');
    if (list) {
      list.innerHTML = data.hotspots.sort((a, b) => b.count - a.count).slice(0, 6).map(s =>
        '<div class="hotspot-item"><div><div class="hi-city">' + s.city + '</div><div class="hi-type">' + s.type + '</div></div><div class="hi-count ' + s.severity + '">' + s.count + '</div></div>'
      ).join('');
    }
    initRadarChart(data.hotspots);
  } catch (e) { console.error('loadRadarData error:', e); }
}

function initRadarChart(hotspots) {
  const typeCounts = {};
  hotspots.forEach(h => { typeCounts[h.type] = (typeCounts[h.type] || 0) + h.count; });
  const ctx = document.getElementById('radarTypeChart');
  if (!ctx) return;
  if (radarTypeChart) radarTypeChart.destroy();
  radarTypeChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(typeCounts),
      datasets: [{ data: Object.values(typeCounts), backgroundColor: ['#ff0040','#ff6600','#ffcc00','#00ff88','#00ccff','#cc00ff','#0066ff','#ff3366','#00ffcc','#ff9900'], borderWidth: 0 }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#7aa0c0', font: { size: 11 } } } } }
  });
}

function initDashboardCharts() {
  fetchStats();
  initTrendChart();
  initTypeChart();
  startThreatFeed();
}

async function fetchStats() {
  try {
    const res = await fetch(API + '/stats');
    const data = await res.json();
    animateCounter('ds-calls', data.callsAnalyzed);
    animateCounter('ds-threats', data.activeThreats);
    animateCounter('ds-links', data.linksScanned);
    animateCounter('ds-users', data.usersProtected);
    animateCounter('hs-protected', data.usersProtected);
    animateCounter('hs-detected', data.totalScamsDetected);
    const badge = document.getElementById('nav-threat-count');
    if (badge) badge.querySelector('span').textContent = data.activeThreats + ' Active Threats';
  } catch (e) { console.error('fetchStats error:', e); }
}

function animateCounter(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const duration = 1500;
  const startTime = performance.now();
  function update(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(eased * target);
    el.textContent = current >= 1000000 ? (current / 1000000).toFixed(1) + 'M+' : current >= 1000 ? (current / 1000).toFixed(0) + 'K+' : current.toString();
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

function initTrendChart() {
  const ctx = document.getElementById('scamTrendChart');
  if (!ctx) return;
  if (scamTrendChart) scamTrendChart.destroy();
  scamTrendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'],
      datasets: [
        { label: 'Phone Scams', data: [1200, 1450, 1800, 2100, 2400, 2800, 3200], borderColor: '#ff0040', backgroundColor: 'rgba(255,0,64,0.1)', tension: 0.4, fill: true },
        { label: 'Phishing', data: [800, 950, 1100, 1350, 1600, 1900, 2200], borderColor: '#00ccff', backgroundColor: 'rgba(0,204,255,0.1)', tension: 0.4, fill: true },
        { label: 'UPI Fraud', data: [600, 750, 900, 1100, 1400, 1700, 2000], borderColor: '#00ff88', backgroundColor: 'rgba(0,255,136,0.1)', tension: 0.4, fill: true }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#7aa0c0' } } }, scales: { x: { ticks: { color: '#7aa0c0' }, grid: { color: 'rgba(13,48,96,0.5)' } }, y: { ticks: { color: '#7aa0c0' }, grid: { color: 'rgba(13,48,96,0.5)' } } } }
  });
}

function initTypeChart() {
  const ctx = document.getElementById('scamTypeChart');
  if (!ctx) return;
  if (scamTypeChart) scamTypeChart.destroy();
  scamTypeChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Phone Scam', 'Phishing', 'UPI Fraud', 'KYC Fraud', 'Job Fraud', 'Investment', 'Deepfake'],
      datasets: [{ label: 'Cases', data: [3200, 2200, 2000, 1800, 1500, 1200, 800], backgroundColor: ['#ff0040','#00ccff','#00ff88','#ffcc00','#cc00ff','#ff6600','#0066ff'], borderRadius: 6 }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#7aa0c0', font: { size: 10 } }, grid: { color: 'rgba(13,48,96,0.5)' } }, y: { ticks: { color: '#7aa0c0' }, grid: { color: 'rgba(13,48,96,0.5)' } } } }
  });
}

const threatTypes = ['Phone Scam', 'Phishing Link', 'UPI Fraud', 'KYC Fraud', 'Deepfake Call', 'Investment Fraud', 'SMS Scam', 'Job Fraud'];
const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Lucknow'];
const severities = ['high', 'high', 'medium', 'medium', 'low'];
let threatFeedStarted = false;

function startThreatFeed() {
  const list = document.getElementById('threat-feed-list');
  if (!list) return;
  if (threatFeedStarted) return;
  threatFeedStarted = true;
  function addFeedItem() {
    const sev = severities[Math.floor(Math.random() * severities.length)];
    const city = cities[Math.floor(Math.random() * cities.length)];
    const type = threatTypes[Math.floor(Math.random() * threatTypes.length)];
    const mins = Math.floor(Math.random() * 5) + 1;
    const item = document.createElement('div');
    item.className = 'feed-item';
    item.innerHTML = '<div class="feed-dot ' + sev + '"></div><div class="feed-city">' + city + '</div><div class="feed-type">' + type + '</div><div class="feed-time">' + mins + 'm ago</div>';
    list.insertBefore(item, list.firstChild);
    if (list.children.length > 8) list.removeChild(list.lastChild);
  }
  for (let i = 0; i < 5; i++) addFeedItem();
  setInterval(addFeedItem, 3000);
}

function addToThreatFeed(data) {
  const list = document.getElementById('threat-feed-list');
  if (!list) return;
  const item = document.createElement('div');
  item.className = 'feed-item';
  item.style.borderColor = data.color;
  item.innerHTML = '<div class="feed-dot high"></div><div class="feed-city">You</div><div class="feed-type">Call Analysis: ' + data.riskLevel + '</div><div class="feed-time">just now</div>';
  list.insertBefore(item, list.firstChild);
}

async function sendChat() {
  const input = document.getElementById('chat-input');
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';
  appendChatMsg(msg, 'user');
  const typing = appendTypingIndicator();
  try {
    const res = await fetch(API + '/assistant/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg })
    });
    const data = await res.json();
    typing.remove();
    appendBotMsg(data.message, data.actions);
  } catch (e) {
    typing.remove();
    appendBotMsg('Connection error. Please call 1930 for immediate help.', ['Call 1930']);
  }
}

function sendQuickMsg(msg) {
  document.getElementById('chat-input').value = msg;
  sendChat();
}

function appendChatMsg(text, type) {
  const messages = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = 'chat-msg ' + type;
  div.innerHTML = '<div class="msg-avatar"><i class="fas fa-user"></i></div><div class="msg-bubble"><p>' + text + '</p></div>';
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
  return div;
}

function appendTypingIndicator() {
  const messages = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = 'chat-msg bot';
  div.innerHTML = '<div class="msg-avatar"><i class="fas fa-robot"></i></div><div class="msg-bubble"><p style="color:#7aa0c0"><i class="fas fa-circle-notch fa-spin"></i> Analyzing...</p></div>';
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
  return div;
}

function appendBotMsg(text, actions) {
  const messages = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = 'chat-msg bot';
  const actionsHtml = actions && actions.length
    ? '<div class="msg-actions">' + actions.map(a => '<button class="msg-action-btn" onclick="sendQuickMsg(\'' + a + '\')">' + a + '</button>').join('') + '</div>'
    : '';
  div.innerHTML = '<div class="msg-avatar"><i class="fas fa-robot"></i></div><div class="msg-bubble"><p>' + text + '</p>' + actionsHtml + '</div>';
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function initSafetyTips() {
  const tips = [
    'Never share OTP, PIN or password with anyone — not even bank officials.',
    'Banks never ask for account details over phone or SMS.',
    'Verify caller identity by calling back on official numbers.',
    'Check URLs carefully before clicking — look for misspellings.',
    'You never need to enter PIN to receive money on UPI.',
    'Legitimate lotteries never ask for fees to claim prizes.',
    'Remote access requests from "tech support" are always scams.',
    'Report fraud immediately to 1930 — time is critical.'
  ];
  const list = document.getElementById('safety-tips');
  if (list) list.innerHTML = tips.map(t => '<div class="tip-item">' + t + '</div>').join('');
}

async function loadScenarios() {
  try {
    const res = await fetch(API + '/simulator/scenarios');
    const data = await res.json();
    simScenarios = data.scenarios;
    const grid = document.getElementById('scenarios-grid');
    if (grid) {
      grid.innerHTML = simScenarios.map(s =>
        '<div class="scenario-card" onclick="startScenario(' + (s.id - 1) + ')">' +
        '<div class="sc-diff ' + s.difficulty + '">' + s.difficulty + '</div>' +
        '<div class="sc-title">' + s.title + '</div>' +
        '<div class="sc-desc">' + s.description + '</div>' +
        '<div class="sc-points"><i class="fas fa-star"></i> ' + s.points + ' points</div>' +
        '</div>'
      ).join('');
    }
  } catch (e) { console.error('loadScenarios error:', e); }
}

function startScenario(index) {
  currentScenarioIndex = index;
  const scenario = simScenarios[index];
  document.getElementById('sim-home').classList.add('hidden');
  document.getElementById('sim-active').classList.remove('hidden');
  document.getElementById('sim-title').textContent = scenario.title;
  const diffEl = document.getElementById('sim-diff');
  diffEl.textContent = scenario.difficulty;
  diffEl.className = 'sim-difficulty sc-diff ' + scenario.difficulty;
  document.getElementById('sim-pts').textContent = scenario.points + ' pts';
  document.getElementById('sim-script').textContent = '"' + scenario.script + '"';
  document.getElementById('sim-feedback').classList.add('hidden');
  document.getElementById('sim-next-btn').classList.add('hidden');
  document.querySelectorAll('.sim-btn').forEach(b => { b.disabled = false; });
}

function simAnswer(isScam) {
  const scenario = simScenarios[currentScenarioIndex];
  const feedback = document.getElementById('sim-feedback');
  const nextBtn = document.getElementById('sim-next-btn');
  document.querySelectorAll('.sim-btn').forEach(b => { b.disabled = true; });
  feedback.classList.remove('hidden', 'correct', 'wrong');
  if (isScam) {
    totalSimScore += scenario.points;
    document.getElementById('sim-total-score').textContent = totalSimScore;
    feedback.classList.add('correct');
    feedback.innerHTML = '<div class="sim-feedback-title">✓ Correct! You identified the scam!</div><p>You earned <strong>' + scenario.points + ' points</strong>. Great job staying safe!</p><div class="sim-red-flags"><strong>Red Flags in this scenario:</strong><br>' + scenario.redFlags.map(f => '<span class="sim-flag">' + f + '</span>').join('') + '</div>';
  } else {
    feedback.classList.add('wrong');
    feedback.innerHTML = '<div class="sim-feedback-title">✗ This was a SCAM!</div><p>Don\'t worry — learning from mistakes is how you stay safe. No points this time.</p><div class="sim-red-flags"><strong>Red Flags you missed:</strong><br>' + scenario.redFlags.map(f => '<span class="sim-flag">' + f + '</span>').join('') + '</div>';
  }
  nextBtn.classList.remove('hidden');
}

function nextScenario() {
  if (currentScenarioIndex < simScenarios.length - 1) {
    startScenario(currentScenarioIndex + 1);
  } else {
    document.getElementById('sim-active').classList.add('hidden');
    document.getElementById('sim-home').classList.remove('hidden');
    alert('Training Complete! Your score: ' + totalSimScore + ' points. Great job staying cyber-safe!');
  }
}

async function submitReport(e) {
  e.preventDefault();
  const type = document.getElementById('r-type').value;
  const desc = document.getElementById('r-desc').value;
  const phone = document.getElementById('r-phone').value;
  const url = document.getElementById('r-url').value;
  const location = document.getElementById('r-location').value;
  const btn = e.submitter;
  if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...'; btn.disabled = true; }
  try {
    const res = await fetch(API + '/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, description: desc, phoneNumber: phone, url, location })
    });
    const data = await res.json();
    document.getElementById('report-form').classList.add('hidden');
    const success = document.getElementById('report-success');
    success.classList.remove('hidden');
    success.innerHTML = '<div style="font-size:48px;color:#00ff88;margin-bottom:16px"><i class="fas fa-check-circle"></i></div><div style="font-family:\'Orbitron\',monospace;font-size:20px;color:#00ff88;margin-bottom:8px">Report Submitted!</div><div class="rs-case">' + data.report.caseNumber + '</div><div style="color:#7aa0c0;font-size:14px;margin-bottom:20px">Your case number. Authorities have been notified.</div><button class="btn-primary" onclick="resetReportForm()"><i class="fas fa-plus"></i> Submit Another Report</button>';
    loadRecentReports();
  } catch (e) {
    console.error('submitReport error:', e);
    alert('Connection error. Make sure server is running on port 3000.');
    if (btn) { btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Report'; btn.disabled = false; }
  }
}

function resetReportForm() {
  document.getElementById('report-form').classList.remove('hidden');
  document.getElementById('report-form').reset();
  document.getElementById('report-success').classList.add('hidden');
}

async function loadRecentReports() {
  try {
    const res = await fetch(API + '/reports');
    const data = await res.json();
    const list = document.getElementById('recent-reports-list');
    if (!list) return;
    if (data.reports.length === 0) {
      list.innerHTML = '<div class="loading-text">No reports yet. Be the first to report!</div>';
      return;
    }
    list.innerHTML = data.reports.slice(-5).reverse().map(r =>
      '<div class="report-item"><div class="ri-type">' + r.type + '</div><div style="color:#7aa0c0;font-size:12px;margin:4px 0">' + r.description.substring(0, 60) + '...</div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px"><div class="ri-case">' + r.caseNumber + '</div><div class="ri-time">' + new Date(r.timestamp).toLocaleTimeString() + '</div></div></div>'
    ).join('');
  } catch (e) { console.error('loadRecentReports error:', e); }
}

function initImpactCharts() {
  const ctx1 = document.getElementById('impactChart1');
  const ctx2 = document.getElementById('impactChart2');
  if (ctx1) {
    new Chart(ctx1, {
      type: 'doughnut',
      data: {
        labels: ['Phone Scam', 'Phishing', 'UPI Fraud', 'KYC Fraud', 'Job Fraud', 'Other'],
        datasets: [{ data: [35, 22, 18, 12, 8, 5], backgroundColor: ['#ff0040','#00ccff','#00ff88','#ffcc00','#cc00ff','#ff6600'], borderWidth: 0 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#7aa0c0', font: { size: 11 } } } } }
    });
  }
  if (ctx2) {
    new Chart(ctx2, {
      type: 'line',
      data: {
        labels: ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'],
        datasets: [{ label: 'Scams Blocked', data: [12000, 15000, 19000, 24000, 31000, 38000, 47000], borderColor: '#00ccff', backgroundColor: 'rgba(0,204,255,0.15)', tension: 0.4, fill: true, pointBackgroundColor: '#00ccff' }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#7aa0c0' } } }, scales: { x: { ticks: { color: '#7aa0c0' }, grid: { color: 'rgba(13,48,96,0.4)' } }, y: { ticks: { color: '#7aa0c0' }, grid: { color: 'rgba(13,48,96,0.4)' } } } }
    });
  }
}

async function loadTestimonials() {
  try {
    const res = await fetch(API + '/testimonials');
    const data = await res.json();
    const grid = document.getElementById('testimonials-grid');
    if (!grid) return;
    grid.innerHTML = data.testimonials.map(t =>
      '<div class="testi-card">' +
      '<div class="testi-header"><div class="testi-avatar" style="background:' + t.avatarColor + '20;border:2px solid ' + t.avatarColor + ';color:' + t.avatarColor + '">' + t.avatar + '</div><div><div class="testi-name">' + t.name + '</div><div class="testi-meta">' + t.age + ' yrs · ' + t.city + '</div></div></div>' +
      '<div class="testi-stars">' + '<i class="fas fa-star"></i>'.repeat(t.stars) + '</div>' +
      '<div class="testi-badge" style="background:' + t.badgeColor + '20;border:1px solid ' + t.badgeColor + '40;color:' + t.badgeColor + '"><i class="fas fa-shield-halved"></i> ' + t.badge + '</div>' +
      '<div class="testi-text">' + t.text + '</div>' +
      '<div class="testi-saved"><i class="fas fa-piggy-bank" style="color:#00ff88"></i><span class="testi-saved-label">Protected:</span><span class="testi-saved-amount">' + t.saved + '</span></div>' +
      (t.verified ? '<div class="testi-verified"><i class="fas fa-circle-check"></i> Verified User · Case Filed on cybercrime.gov.in</div>' : '') +
      '</div>'
    ).join('');
  } catch (e) { console.error('loadTestimonials error:', e); }
}

async function loadComparison() {
  try {
    const res = await fetch(API + '/comparison');
    const data = await res.json();
    const tbody = document.getElementById('comparison-tbody');
    if (!tbody) return;
    tbody.innerHTML = data.features.map(f =>
      '<tr>' +
      '<td class="ct-feature-cell">' + f.feature + (f.note ? '<span class="ct-feature-note">' + f.note + '</span>' : '') + '</td>' +
      '<td>' + (f.others ? '<i class="fas fa-check check-yes"></i>' : '<i class="fas fa-xmark check-no"></i>') + '</td>' +
      '<td class="ct-ours-cell"><i class="fas fa-check check-yes" style="font-size:20px;filter:drop-shadow(0 0 6px #00ff88)"></i></td>' +
      '</tr>'
    ).join('');
  } catch (e) { console.error('loadComparison error:', e); }
}

function createParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = Math.random() * 100 + '%';
    p.style.animationDuration = (Math.random() * 15 + 10) + 's';
    p.style.animationDelay = (Math.random() * 10) + 's';
    p.style.width = p.style.height = (Math.random() * 3 + 1) + 'px';
    container.appendChild(p);
  }
}

async function initLandingStats() {
  try {
    const res = await fetch(API + '/stats');
    const data = await res.json();
    const badge = document.getElementById('nav-threat-count');
    if (badge) badge.querySelector('span').textContent = data.activeThreats + ' Active Threats';
  } catch (e) {}
}

document.addEventListener('DOMContentLoaded', () => {
  createParticles();
  initLandingStats();
  initImpactCharts();
  loadTestimonials();
  loadComparison();
  initGallery();
  ttsInit();
  setTimeout(loadVoices, 500);
  setInterval(initLandingStats, 10000);
});
let audioCtx = null;
let isMuted = false;
let currentPlayingItem = null;
let demoScenarioIndex = 0;
let demoRunning = false;

const demoScenarios = [
  {
    name: 'Bank KYC Scam',
    phone: '+91 98765 43210',
    transcript: 'Your SBI account will be blocked. Share OTP to update KYC immediately.',
    score: 91,
    tags: ['OTP Request', 'Urgency', 'Account Threat', 'Bank Impersonation'],
    rec: 'HANG UP IMMEDIATELY. SBI never asks for OTP on call.',
    steps: ['Voice pattern analysis...', 'Keyword detection: OTP, urgent, blocked', 'Caller ID cross-reference...', 'Scam database match found!', 'Fraud probability calculated']
  },
  {
    name: 'Lottery Fraud',
    phone: '+91 70000 12345',
    transcript: 'Congratulations! You won Rs 50 Lakh lottery. Pay Rs 5000 processing fee now.',
    score: 96,
    tags: ['Prize Bait', 'Fee Request', 'Unsolicited', 'Financial Fraud'],
    rec: 'SCAM CONFIRMED. No legitimate lottery charges fees to claim prizes.',
    steps: ['Analyzing call content...', 'Prize/lottery keywords detected', 'Fee request pattern matched', 'Known scam script identified!', 'Risk score: CRITICAL']
  },
  {
    name: 'Deepfake Voice',
    phone: '+91 99887 76655',
    transcript: 'Beta, main papa bol raha hoon. Emergency hai. Abhi 20,000 transfer karo.',
    score: 88,
    tags: ['Deepfake Voice', 'Family Impersonation', 'Urgency', 'AI Generated'],
    rec: 'AI VOICE DETECTED. Call back on known number before any transfer.',
    steps: ['Voiceprint analysis started...', 'Spectral frequency scanning...', 'AI synthesis artifacts found!', 'Voice clone probability: 84%', 'DEEPFAKE ALERT triggered']
  },
  {
    name: 'Tech Support',
    phone: '+91 80000 99999',
    transcript: 'Microsoft support here. Your computer has virus. Install TeamViewer now for remote fix.',
    score: 94,
    tags: ['Remote Access', 'Tech Support Scam', 'Fear Tactics', 'Impersonation'],
    rec: 'DO NOT INSTALL anything. Microsoft never calls unsolicited.',
    steps: ['Call origin analysis...', 'Remote access request detected', 'Microsoft impersonation flagged', 'Known tech support scam pattern!', 'Blocking recommended']
  }
];

function setDemoScenario(index) {
  demoScenarioIndex = index;
  document.querySelectorAll('.vds-btn').forEach((b, i) => b.classList.toggle('active', i === index));
  if (demoRunning) startVideoDemo();
}

function startVideoDemo() {
  if (demoRunning) {
    demoRunning = false;
    clearAllDemoTimeouts();
  }
  demoRunning = true;
  const scenario = demoScenarios[demoScenarioIndex];
  const idle = document.getElementById('vs-idle');
  const scene = document.getElementById('vs-scene');
  const replayBtn = document.getElementById('vs-replay-btn');
  if (idle) idle.classList.add('hidden');
  if (scene) scene.classList.remove('hidden');
  if (replayBtn) replayBtn.style.display = 'none';

  const phone = document.getElementById('vs-phone');
  const aiScan = document.getElementById('vs-ai-scan');
  const alert = document.getElementById('vs-alert');
  if (phone) phone.classList.remove('hidden');
  if (aiScan) aiScan.classList.add('hidden');
  if (alert) alert.classList.add('hidden');

  const phoneNum = phone ? phone.querySelector('.vs-phone-num') : null;
  if (phoneNum) phoneNum.textContent = scenario.phone;

  if (!isMuted) playAudioTone('ring');

  demoTimeout(1800, () => {
    if (phone) phone.classList.add('hidden');
    if (aiScan) aiScan.classList.remove('hidden');
    if (!isMuted) playAudioTone('scan');
    runScanAnimation(scenario);
  });
}

const demoTimeouts = [];
function demoTimeout(ms, fn) {
  const t = setTimeout(fn, ms);
  demoTimeouts.push(t);
  return t;
}
function clearAllDemoTimeouts() {
  demoTimeouts.forEach(t => clearTimeout(t));
  demoTimeouts.length = 0;
}

function runScanAnimation(scenario) {
  const bar = document.getElementById('vs-scan-bar');
  const stepsEl = document.getElementById('vs-scan-steps');
  const scanText = document.getElementById('vs-scan-text');
  if (stepsEl) stepsEl.innerHTML = '';

  let progress = 0;
  const interval = setInterval(() => {
    progress = Math.min(progress + 2, 100);
    if (bar) bar.style.width = progress + '%';
    if (progress >= 100) clearInterval(interval);
  }, 40);

  scenario.steps.forEach((step, i) => {
    demoTimeout(400 + i * 500, () => {
      if (!stepsEl) return;
      const prev = stepsEl.querySelector('.active');
      if (prev) { prev.classList.remove('active'); prev.classList.add('done'); prev.innerHTML = '<i class="fas fa-check" style="color:#00ff88"></i> ' + prev.textContent; }
      const div = document.createElement('div');
      div.className = 'vs-step active';
      div.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> ' + step;
      stepsEl.appendChild(div);
      if (scanText) scanText.textContent = step;
    });
  });

  demoTimeout(400 + scenario.steps.length * 500 + 300, () => {
    const aiScan = document.getElementById('vs-ai-scan');
    const alertEl = document.getElementById('vs-alert');
    if (aiScan) aiScan.classList.add('hidden');
    if (alertEl) alertEl.classList.remove('hidden');

    const scoreEl = document.getElementById('vs-alert-score');
    const tagsEl = document.getElementById('vs-alert-tags');
    const recEl = document.getElementById('vs-alert-rec');
    const replayBtn = document.getElementById('vs-replay-btn');

    if (scoreEl) scoreEl.textContent = scenario.score + '%';
    if (tagsEl) tagsEl.innerHTML = scenario.tags.map(t => '<span class="vs-alert-tag">' + t + '</span>').join('');
    if (recEl) recEl.textContent = scenario.rec;
    if (replayBtn) replayBtn.style.display = 'flex';

    if (!isMuted) playAudioAlert('scam');
    showScamPopup('Demo: ' + scenario.name + ' detected!', scenario.score);
    demoRunning = false;
  });
}

function demoBlock() {
  const alertEl = document.getElementById('vs-alert');
  if (alertEl) {
    alertEl.innerHTML = '<div style="text-align:center;padding:20px"><div style="font-size:48px;color:#00ff88;margin-bottom:12px"><i class="fas fa-ban"></i></div><div style="font-family:Orbitron,monospace;font-size:16px;color:#00ff88">NUMBER BLOCKED</div><div style="font-size:13px;color:#7aa0c0;margin-top:8px">Scammer blocked. Community database updated.</div><button class="vs-play-btn" style="margin:16px auto 0;font-size:13px;padding:10px 24px" onclick="startVideoDemo()"><i class="fas fa-rotate-right"></i> Replay</button></div>';
  }
  if (!isMuted) playAudioAlert('safe');
}

function demoReport() {
  showPage('report');
}

function toggleMute() {
  isMuted = !isMuted;
  const icon = document.getElementById('mute-icon');
  if (icon) icon.className = isMuted ? 'fas fa-volume-xmark' : 'fas fa-volume-high';
}

function getAudioContext() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playAudioTone(type) {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    if (type === 'ring') {
      [0, 0.5, 1.0].forEach(delay => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 480;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0, ctx.currentTime + delay);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + delay + 0.05);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + delay + 0.4);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.4);
      });
    } else if (type === 'scan') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 2);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 2);
    }
  } catch (e) {}
}

function playAudioAlert(type) {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    const configs = {
      scam: { freqs: [880, 660, 880, 660, 880], dur: 0.15, type: 'square', vol: 0.4, color: '#ff0040' },
      warning: { freqs: [440, 550, 440], dur: 0.2, type: 'triangle', vol: 0.3, color: '#ff6600' },
      safe: { freqs: [523, 659, 784], dur: 0.25, type: 'sine', vol: 0.3, color: '#00ff88' },
      deepfake: { freqs: [300, 150, 300, 150], dur: 0.3, type: 'sawtooth', vol: 0.25, color: '#cc00ff' },
      sos: { freqs: [1000, 800, 1000, 800, 1000, 800], dur: 0.12, type: 'square', vol: 0.5, color: '#ff0040' }
    };
    const cfg = configs[type] || configs.warning;

    cfg.freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = cfg.type;
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * (cfg.dur + 0.05);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(cfg.vol, start + 0.01);
      gain.gain.linearRampToValueAtTime(0, start + cfg.dur);
      osc.start(start);
      osc.stop(start + cfg.dur + 0.01);
    });

    animateAudioVisualizer(cfg.color);
    highlightPlayButton(type);
  } catch (e) { console.error('Audio error:', e); }
}

function animateAudioVisualizer(color) {
  const bars = document.querySelectorAll('.av-bar');
  bars.forEach(b => { b.classList.add('active'); b.style.background = 'linear-gradient(to top,' + color + '88,' + color + ')'; });
  setTimeout(() => bars.forEach(b => { b.classList.remove('active'); b.style.height = '4px'; }), 2000);
}

function highlightPlayButton(type) {
  const map = { scam: 'play-scam', warning: 'play-warning', safe: 'play-safe', deepfake: 'play-deepfake', sos: 'play-sos' };
  const btnId = map[type];
  if (!btnId) return;
  if (currentPlayingItem) currentPlayingItem.classList.remove('playing');
  const item = document.getElementById(btnId) ? document.getElementById(btnId).closest('.audio-alert-item') : null;
  if (item) {
    item.classList.add('playing');
    currentPlayingItem = item;
    const btn = document.getElementById(btnId);
    if (btn) { btn.innerHTML = '<i class="fas fa-stop"></i>'; }
    setTimeout(() => {
      item.classList.remove('playing');
      if (btn) btn.innerHTML = '<i class="fas fa-play"></i>';
      if (currentPlayingItem === item) currentPlayingItem = null;
    }, 2500);
  }
}

const galleryData = [
  {
    id: 1,
    type: 'PHONE SCAM',
    typeColor: '#ff0040',
    title: 'Bank KYC Fraud Call',
    stat: '3,200+ cases/month',
    risk: 'CRITICAL',
    riskBg: 'rgba(255,0,64,0.8)',
    bgGrad: ['#1a0010', '#3d0020'],
    iconColor: '#ff0040',
    icon: 'phone',
    desc: 'Fraudsters impersonate bank officials and demand OTP, account numbers or PIN under the pretext of KYC update or account suspension.',
    stats: [{ num: '₹2.1L', label: 'Avg Loss' }, { num: '91%', label: 'Detection Rate' }, { num: '3,200', label: 'Monthly Cases' }, { num: '0.3s', label: 'Alert Time' }],
    how: ['AI detects urgency language and bank-related keywords', 'Caller ID cross-referenced with scam database', 'OTP/PIN request pattern triggers immediate alert', 'User warned before sharing any sensitive data']
  },
  {
    id: 2,
    type: 'DEEPFAKE',
    typeColor: '#cc00ff',
    title: 'AI Voice Clone Attack',
    stat: '412+ cases/month',
    risk: 'HIGH',
    riskBg: 'rgba(204,0,255,0.8)',
    bgGrad: ['#0d0020', '#1a0040'],
    iconColor: '#cc00ff',
    icon: 'microphone-slash',
    desc: 'Criminals use AI to clone voices of family members or officials. The fake voice calls victims demanding urgent money transfers.',
    stats: [{ num: '₹4.3L', label: 'Avg Loss' }, { num: '84%', label: 'Detection Rate' }, { num: '412', label: 'Monthly Cases' }, { num: '1.2s', label: 'Alert Time' }],
    how: ['Voiceprint spectral analysis detects AI synthesis artifacts', 'Frequency patterns compared against known deepfake signatures', 'Emotional manipulation language flagged', 'Family alert sent to registered contacts instantly']
  },
  {
    id: 3,
    type: 'PHISHING',
    typeColor: '#ffcc00',
    title: 'Fake Job Offer Link',
    stat: '2,800+ cases/month',
    risk: 'HIGH',
    riskBg: 'rgba(255,204,0,0.8)',
    bgGrad: ['#1a1000', '#2d2000'],
    iconColor: '#ffcc00',
    icon: 'link',
    desc: 'Fake job portals and WhatsApp messages with phishing links steal personal data, bank credentials and install malware on devices.',
    stats: [{ num: '₹85K', label: 'Avg Loss' }, { num: '89%', label: 'Detection Rate' }, { num: '2,800', label: 'Monthly Cases' }, { num: '0.1s', label: 'Alert Time' }],
    how: ['URL domain analyzed for misspellings and suspicious TLDs', 'SSL certificate and domain age verified', 'Known phishing database cross-check', 'Link blocked before user can click']
  },
  {
    id: 4,
    type: 'UPI FRAUD',
    typeColor: '#00ff88',
    title: 'Fake Payment Request',
    stat: '2,000+ cases/month',
    risk: 'HIGH',
    riskBg: 'rgba(0,255,136,0.7)',
    bgGrad: ['#001a10', '#002d1a'],
    iconColor: '#00ff88',
    icon: 'indian-rupee-sign',
    desc: 'Scammers send fake UPI collect requests disguised as "receiving money". Victims enter PIN thinking they are receiving funds.',
    stats: [{ num: '₹45K', label: 'Avg Loss' }, { num: '87%', label: 'Detection Rate' }, { num: '2,000', label: 'Monthly Cases' }, { num: '0.2s', label: 'Alert Time' }],
    how: ['UPI ID verified against known fraud database', 'Collect request vs send request pattern detected', 'Urgency language in payment note flagged', 'User warned: "You never need PIN to receive money"']
  },
  {
    id: 5,
    type: 'INVESTMENT FRAUD',
    typeColor: '#00ccff',
    title: 'Crypto Ponzi Scheme',
    stat: '1,200+ cases/month',
    risk: 'CRITICAL',
    riskBg: 'rgba(0,204,255,0.8)',
    bgGrad: ['#001020', '#001a35'],
    iconColor: '#00ccff',
    icon: 'chart-line',
    desc: 'WhatsApp groups and Telegram channels promise 300% returns on crypto investments. Victims lose entire savings to Ponzi schemes.',
    stats: [{ num: '₹8.2L', label: 'Avg Loss' }, { num: '78%', label: 'Detection Rate' }, { num: '1,200', label: 'Monthly Cases' }, { num: '0.5s', label: 'Alert Time' }],
    how: ['Guaranteed returns language triggers immediate flag', 'Crypto/investment keywords analyzed for fraud patterns', 'Group admin identity verification check', 'Predictive AI warns before investment is made']
  },
  {
    id: 6,
    type: 'TECH SUPPORT',
    typeColor: '#ff6600',
    title: 'Microsoft/Apple Scam',
    stat: '890+ cases/month',
    risk: 'HIGH',
    riskBg: 'rgba(255,102,0,0.8)',
    bgGrad: ['#1a0800', '#2d1000'],
    iconColor: '#ff6600',
    icon: 'laptop',
    desc: 'Fake tech support calls claim your device has a virus. They request remote access via TeamViewer/AnyDesk to steal data and money.',
    stats: [{ num: '₹1.2L', label: 'Avg Loss' }, { num: '94%', label: 'Detection Rate' }, { num: '890', label: 'Monthly Cases' }, { num: '0.4s', label: 'Alert Time' }],
    how: ['Remote access software request detected immediately', 'Microsoft/Apple impersonation keywords flagged', 'Unsolicited tech support call pattern matched', 'Remote access blocked and user alerted']
  }
];

function buildGalleryCard(item) {
  const card = document.createElement('div');
  card.className = 'gallery-card';
  card.onclick = () => openLightbox(item);
  card.innerHTML =
    '<div class="gc-visual" style="background:linear-gradient(135deg,' + item.bgGrad[0] + ',' + item.bgGrad[1] + ')">' +
    buildScamSVG(item) +
    '<div class="gc-overlay"><button class="gc-view-btn"><i class="fas fa-expand"></i> View Details</button></div>' +
    '<div class="gc-risk" style="background:' + item.riskBg + ';color:#fff">' + item.risk + '</div>' +
    '</div>' +
    '<div class="gc-info">' +
    '<div class="gc-type" style="color:' + item.typeColor + '">' + item.type + '</div>' +
    '<div class="gc-title">' + item.title + '</div>' +
    '<div class="gc-stat" style="color:' + item.typeColor + '">' + item.stat + '</div>' +
    '</div>';
  return card;
}

function buildScamSVG(item) {
  const c = item.iconColor;
  return '<svg viewBox="0 0 220 160" xmlns="http://www.w3.org/2000/svg">' +
    '<defs><radialGradient id="rg' + item.id + '" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="' + c + '" stop-opacity="0.2"/><stop offset="100%" stop-color="' + c + '" stop-opacity="0"/></radialGradient></defs>' +
    '<rect width="220" height="160" fill="url(#rg' + item.id + ')"/>' +
    '<circle cx="110" cy="70" r="45" fill="none" stroke="' + c + '" stroke-width="1" stroke-opacity="0.3"/>' +
    '<circle cx="110" cy="70" r="30" fill="none" stroke="' + c + '" stroke-width="1.5" stroke-opacity="0.5"/>' +
    '<circle cx="110" cy="70" r="18" fill="' + c + '" fill-opacity="0.15" stroke="' + c + '" stroke-width="2"/>' +
    '<text x="110" y="78" text-anchor="middle" font-size="18" fill="' + c + '" font-family="Arial">⚠</text>' +
    '<text x="110" y="130" text-anchor="middle" font-size="11" fill="' + c + '" font-family="Orbitron,Arial" font-weight="bold" opacity="0.8">' + item.type + '</text>' +
    '<line x1="30" y1="70" x2="65" y2="70" stroke="' + c + '" stroke-width="1" stroke-opacity="0.4" stroke-dasharray="4,3"/>' +
    '<line x1="155" y1="70" x2="190" y2="70" stroke="' + c + '" stroke-width="1" stroke-opacity="0.4" stroke-dasharray="4,3"/>' +
    '<circle cx="30" cy="70" r="3" fill="' + c + '" opacity="0.6"/>' +
    '<circle cx="190" cy="70" r="3" fill="' + c + '" opacity="0.6"/>' +
    '</svg>';
}

function openLightbox(item) {
  const lb = document.getElementById('lightbox');
  const lbVisual = document.getElementById('lb-visual');
  const lbBadge = document.getElementById('lb-badge');
  const lbTitle = document.getElementById('lb-title');
  const lbDesc = document.getElementById('lb-desc');
  const lbStats = document.getElementById('lb-stats');
  const lbHowSteps = document.getElementById('lb-how-steps');

  if (lbVisual) lbVisual.style.background = 'linear-gradient(135deg,' + item.bgGrad[0] + ',' + item.bgGrad[1] + ')';
  if (lbVisual) lbVisual.innerHTML = buildLightboxSVG(item);
  if (lbBadge) { lbBadge.textContent = item.type; lbBadge.style.cssText = 'background:' + item.typeColor + '20;border:1px solid ' + item.typeColor + '50;color:' + item.typeColor + ';display:inline-block;font-size:11px;font-weight:700;letter-spacing:1px;padding:4px 12px;border-radius:4px;margin-bottom:12px'; }
  if (lbTitle) lbTitle.textContent = item.title;
  if (lbDesc) lbDesc.textContent = item.desc;
  if (lbStats) lbStats.innerHTML = item.stats.map(s => '<div class="lb-stat"><div class="lb-stat-num" style="color:' + item.typeColor + '">' + s.num + '</div><div class="lb-stat-label">' + s.label + '</div></div>').join('');
  if (lbHowSteps) lbHowSteps.innerHTML = item.how.map(h => '<div class="lb-how-step">' + h + '</div>').join('');

  lb.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  if (!isMuted) playAudioAlert('warning');
}

function buildLightboxSVG(item) {
  const c = item.iconColor;
  return '<svg viewBox="0 0 300 400" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">' +
    '<defs><radialGradient id="lbg' + item.id + '" cx="50%" cy="40%" r="60%"><stop offset="0%" stop-color="' + c + '" stop-opacity="0.25"/><stop offset="100%" stop-color="' + c + '" stop-opacity="0"/></radialGradient></defs>' +
    '<rect width="300" height="400" fill="url(#lbg' + item.id + ')"/>' +
    '<circle cx="150" cy="160" r="80" fill="none" stroke="' + c + '" stroke-width="1" stroke-opacity="0.2"/>' +
    '<circle cx="150" cy="160" r="60" fill="none" stroke="' + c + '" stroke-width="1.5" stroke-opacity="0.35"/>' +
    '<circle cx="150" cy="160" r="40" fill="none" stroke="' + c + '" stroke-width="2" stroke-opacity="0.5"/>' +
    '<circle cx="150" cy="160" r="28" fill="' + c + '" fill-opacity="0.15" stroke="' + c + '" stroke-width="2.5"/>' +
    '<text x="150" y="170" text-anchor="middle" font-size="28" fill="' + c + '" font-family="Arial">⚠</text>' +
    '<text x="150" y="280" text-anchor="middle" font-size="13" fill="' + c + '" font-family="Orbitron,Arial" font-weight="bold">' + item.type + '</text>' +
    '<text x="150" y="300" text-anchor="middle" font-size="10" fill="' + c + '" font-family="Arial" opacity="0.7">ScamShield X Protected</text>' +
    '<line x1="50" y1="160" x2="90" y2="160" stroke="' + c + '" stroke-width="1" stroke-opacity="0.4" stroke-dasharray="5,4"/>' +
    '<line x1="210" y1="160" x2="250" y2="160" stroke="' + c + '" stroke-width="1" stroke-opacity="0.4" stroke-dasharray="5,4"/>' +
    '<circle cx="50" cy="160" r="4" fill="' + c + '" opacity="0.5"/>' +
    '<circle cx="250" cy="160" r="4" fill="' + c + '" opacity="0.5"/>' +
    '<circle cx="150" cy="80" r="4" fill="' + c + '" opacity="0.4"/>' +
    '<circle cx="150" cy="240" r="4" fill="' + c + '" opacity="0.4"/>' +
    '</svg>';
}

function closeLightbox() {
  const lb = document.getElementById('lightbox');
  if (lb) lb.classList.add('hidden');
  document.body.style.overflow = '';
}

function initGallery() {
  const grid = document.getElementById('gallery-grid');
  if (!grid) return;
  grid.innerHTML = '';
  galleryData.forEach(item => grid.appendChild(buildGalleryCard(item)));
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

const ttsQuickTexts = [
  'Aapka SBI bank account suspend ho gaya hai. Aaj raat 12 baje permanently block ho jaayega. Abhi apna OTP aur account number share karo warna aapka paisa doob jaayega. Yeh ek urgent notice hai bank ki taraf se.',
  'Congratulations! Aap National Digital Lottery ke winner hain. Aapko 50 lakh rupaye ka prize mila hai. Prize claim karne ke liye abhi 5000 rupaye processing fee bhejo is UPI ID par: lottery@fraud.com. Offer sirf 2 ghante ke liye valid hai.',
  'Dear Candidate, aapka TCS mein selection ho gaya hai. Joining letter lene ke liye is link par click karo aur apni bank details aur Aadhar card submit karo. Yeh offer sirf aaj ke liye valid hai. Delay mat karo.',
  'SCAM ALERT: Agar koi aapko call karke OTP maange, bank details maange, ya kisi link par click karne ko kahe — toh yeh SCAM hai. Turant call kaato. Kisi ke saath bhi apna OTP, PIN ya password share mat karo. ScamShield X aapki raksha karta hai.',
  'Beta, main papa bol raha hoon. Mujhe abhi bahut emergency hai. Hospital mein hoon. Tumhara phone nahi lag raha tha. Please abhi 20,000 rupaye is number par transfer karo. Baad mein sab explain karunga. Jaldi karo please.'
];

let ttsSpeaking = false;
let ttsPaused = false;
let ttsUtterance = null;
let ttsVizInterval = null;
let ttsProgressInterval = null;
let ttsStartTime = 0;
let ttsEstDuration = 0;
let ttsVoices = [];

function ttsInit() {
  if (!('speechSynthesis' in window)) {
    const status = document.getElementById('tts-status-text');
    if (status) status.textContent = 'Not supported in this browser';
    const playBtn = document.getElementById('tts-btn-play');
    if (playBtn) { playBtn.disabled = true; playBtn.innerHTML = '<i class="fas fa-xmark"></i> Not Supported'; }
    return;
  }
  loadVoices();
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = loadVoices;
  }
}

function loadVoices() {
  ttsVoices = speechSynthesis.getVoices();
  const sel = document.getElementById('tts-voice-select');
  if (!sel || ttsVoices.length === 0) return;
  sel.innerHTML = '';

  const preferred = ['hi-IN', 'en-IN', 'en-US', 'en-GB'];
  const sorted = [...ttsVoices].sort((a, b) => {
    const ai = preferred.findIndex(p => a.lang.startsWith(p.split('-')[0]));
    const bi = preferred.findIndex(p => b.lang.startsWith(p.split('-')[0]));
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  sorted.forEach((v, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.dataset.name = v.name;
    opt.dataset.lang = v.lang;
    const flag = v.lang.startsWith('hi') ? '🇮🇳 ' : v.lang.startsWith('en-IN') ? '🇮🇳 ' : v.lang.startsWith('en') ? '🇬🇧 ' : '🌐 ';
    opt.textContent = flag + v.name + ' (' + v.lang + ')';
    if (v.lang.startsWith('hi') || v.lang.startsWith('en-IN')) opt.style.color = '#00ccff';
    sel.appendChild(opt);
  });

  const hindiIdx = sorted.findIndex(v => v.lang.startsWith('hi'));
  const enInIdx = sorted.findIndex(v => v.lang.startsWith('en-IN'));
  sel.selectedIndex = hindiIdx >= 0 ? hindiIdx : enInIdx >= 0 ? enInIdx : 0;
}

function ttsGetSelectedVoice() {
  const sel = document.getElementById('tts-voice-select');
  if (!sel || ttsVoices.length === 0) return null;
  const idx = parseInt(sel.value);
  const sorted = [...ttsVoices].sort((a, b) => {
    const preferred = ['hi-IN', 'en-IN', 'en-US', 'en-GB'];
    const ai = preferred.findIndex(p => a.lang.startsWith(p.split('-')[0]));
    const bi = preferred.findIndex(p => b.lang.startsWith(p.split('-')[0]));
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
  return sorted[idx] || ttsVoices[0];
}

function ttsCharCount() {
  const input = document.getElementById('tts-input');
  const counter = document.getElementById('tts-char-count');
  if (input && counter) counter.textContent = input.value.length;
}

function ttsLoadQuick(index) {
  const input = document.getElementById('tts-input');
  if (input) {
    input.value = ttsQuickTexts[index];
    ttsCharCount();
    input.focus();
    document.querySelectorAll('.tts-qt-btn').forEach((b, i) => {
      b.style.borderColor = i === index ? 'var(--neon)' : '';
      b.style.color = i === index ? 'var(--neon)' : '';
    });
  }
}

function ttsSetStatus(state, text) {
  const dot = document.getElementById('tts-ind-dot');
  const statusText = document.getElementById('tts-status-text');
  const textarea = document.getElementById('tts-textarea') || document.getElementById('tts-input');
  if (dot) { dot.className = 'tts-ind-dot ' + state; }
  if (statusText) statusText.textContent = text;
  if (textarea) {
    textarea.classList.toggle('speaking', state === 'speaking');
  }
}

function ttsPlay() {
  if (!('speechSynthesis' in window)) { alert('Text-to-Speech is not supported in your browser. Please use Chrome or Edge.'); return; }

  const input = document.getElementById('tts-input');
  const text = input ? input.value.trim() : '';
  if (!text) { alert('Pehle kuch text type karo ya Quick Load se koi example choose karo!'); input && input.focus(); return; }

  if (ttsPaused && speechSynthesis.paused) {
    speechSynthesis.resume();
    ttsPaused = false;
    ttsSpeaking = true;
    ttsSetStatus('speaking', 'Speaking...');
    ttsStartVizualizer();
    ttsResumeProgress();
    updateTTSButtons(true, false);
    return;
  }

  speechSynthesis.cancel();
  ttsUtterance = new SpeechSynthesisUtterance(text);

  const voice = ttsGetSelectedVoice();
  if (voice) ttsUtterance.voice = voice;
  ttsUtterance.rate = parseFloat(document.getElementById('tts-rate').value) || 1;
  ttsUtterance.pitch = parseFloat(document.getElementById('tts-pitch').value) || 1;
  ttsUtterance.volume = parseFloat(document.getElementById('tts-volume').value) || 1;

  const words = text.split(/\s+/).length;
  ttsEstDuration = (words / (ttsUtterance.rate * 2.5)) * 1000;
  ttsStartTime = Date.now();

  ttsUtterance.onstart = () => {
    ttsSpeaking = true;
    ttsPaused = false;
    ttsSetStatus('speaking', 'Speaking...');
    ttsStartVizualizer();
    ttsStartProgress();
    updateTTSButtons(true, false);
  };

  ttsUtterance.onboundary = (e) => {
    if (e.name === 'word') ttsHighlightWord(text, e.charIndex, e.charLength);
  };

  ttsUtterance.onpause = () => {
    ttsPaused = true;
    ttsSpeaking = false;
    ttsSetStatus('paused', 'Paused');
    ttsStopVizualizer();
  };

  ttsUtterance.onresume = () => {
    ttsPaused = false;
    ttsSpeaking = true;
    ttsSetStatus('speaking', 'Speaking...');
    ttsStartVizualizer();
  };

  ttsUtterance.onend = () => {
    ttsSpeaking = false;
    ttsPaused = false;
    ttsSetStatus('ready', 'Done ✓');
    ttsStopVizualizer();
    ttsStopProgress(100);
    updateTTSButtons(false, false);
    ttsUtterance = null;
    setTimeout(() => ttsSetStatus('ready', 'Ready'), 3000);
  };

  ttsUtterance.onerror = (e) => {
    ttsSpeaking = false;
    ttsPaused = false;
    ttsSetStatus('error', 'Error: ' + e.error);
    ttsStopVizualizer();
    ttsStopProgress(0);
    updateTTSButtons(false, false);
  };

  speechSynthesis.speak(ttsUtterance);
}

function ttsPause() {
  if (ttsSpeaking && !ttsPaused) {
    speechSynthesis.pause();
    ttsPaused = true;
    ttsSpeaking = false;
    ttsSetStatus('paused', 'Paused');
    ttsStopVizualizer();
    updateTTSButtons(false, true);
  }
}

function ttsStop() {
  speechSynthesis.cancel();
  ttsSpeaking = false;
  ttsPaused = false;
  ttsSetStatus('ready', 'Stopped');
  ttsStopVizualizer();
  ttsStopProgress(0);
  updateTTSButtons(false, false);
  ttsUtterance = null;
  const hl = document.getElementById('tts-word-highlight');
  if (hl) hl.innerHTML = '';
  setTimeout(() => ttsSetStatus('ready', 'Ready'), 2000);
}

function ttsClear() {
  ttsStop();
  const input = document.getElementById('tts-input');
  if (input) { input.value = ''; ttsCharCount(); input.focus(); }
  document.querySelectorAll('.tts-qt-btn').forEach(b => { b.style.borderColor = ''; b.style.color = ''; });
}

function ttsPreview() {
  speechSynthesis.cancel();
  const preview = new SpeechSynthesisUtterance('ScamShield X Voice AI ready. Aapki seva mein hazir hoon.');
  const voice = ttsGetSelectedVoice();
  if (voice) preview.voice = voice;
  preview.rate = parseFloat(document.getElementById('tts-rate').value) || 1;
  preview.pitch = parseFloat(document.getElementById('tts-pitch').value) || 1;
  preview.volume = parseFloat(document.getElementById('tts-volume').value) || 1;
  preview.onstart = () => { ttsSetStatus('speaking', 'Preview...'); ttsStartVizualizer(); };
  preview.onend = () => { ttsSetStatus('ready', 'Ready'); ttsStopVizualizer(); };
  speechSynthesis.speak(preview);
}

function updateTTSButtons(isSpeaking, isPaused) {
  const playBtn = document.getElementById('tts-btn-play');
  const pauseBtn = document.getElementById('tts-btn-pause');
  const stopBtn = document.getElementById('tts-btn-stop');
  const playIcon = document.getElementById('tts-play-icon');
  const playLabel = document.getElementById('tts-btn-label');

  if (isSpeaking) {
    if (playBtn) { playBtn.classList.add('speaking'); playBtn.disabled = false; }
    if (playIcon) playIcon.className = 'fas fa-volume-high';
    if (playLabel) playLabel.textContent = 'Speaking...';
    if (pauseBtn) pauseBtn.disabled = false;
    if (stopBtn) stopBtn.disabled = false;
  } else if (isPaused) {
    if (playBtn) { playBtn.classList.remove('speaking'); playBtn.disabled = false; }
    if (playIcon) playIcon.className = 'fas fa-play';
    if (playLabel) playLabel.textContent = 'Resume';
    if (pauseBtn) pauseBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = false;
  } else {
    if (playBtn) { playBtn.classList.remove('speaking'); playBtn.disabled = false; }
    if (playIcon) playIcon.className = 'fas fa-play';
    if (playLabel) playLabel.textContent = 'Speak Now';
    if (pauseBtn) pauseBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = true;
  }
}

function ttsStartVizualizer() {
  ttsStopVizualizer();
  const bars = document.querySelectorAll('.tts-vbar');
  ttsVizInterval = setInterval(() => {
    bars.forEach(bar => {
      const h = Math.random() * 36 + 4;
      bar.style.height = h + 'px';
      bar.classList.add('active');
    });
  }, 80);
}

function ttsStopVizualizer() {
  if (ttsVizInterval) { clearInterval(ttsVizInterval); ttsVizInterval = null; }
  const bars = document.querySelectorAll('.tts-vbar');
  bars.forEach(bar => { bar.style.height = '4px'; bar.classList.remove('active'); });
}

function ttsStartProgress() {
  ttsStopProgress(0);
  const bar = document.getElementById('tts-progress-bar');
  const label = document.getElementById('tts-progress-label');
  ttsProgressInterval = setInterval(() => {
    const elapsed = Date.now() - ttsStartTime;
    const pct = Math.min((elapsed / ttsEstDuration) * 100, 99);
    if (bar) bar.style.width = pct + '%';
    if (label) label.textContent = Math.round(pct) + '%';
  }, 200);
}

function ttsResumeProgress() {
  ttsStartTime = Date.now() - (ttsEstDuration * (parseFloat(document.getElementById('tts-progress-bar').style.width) / 100));
  ttsStartProgress();
}

function ttsStopProgress(finalPct) {
  if (ttsProgressInterval) { clearInterval(ttsProgressInterval); ttsProgressInterval = null; }
  const bar = document.getElementById('tts-progress-bar');
  const label = document.getElementById('tts-progress-label');
  if (bar) bar.style.width = finalPct + '%';
  if (label) label.textContent = finalPct + '%';
}

function ttsHighlightWord(fullText, charIndex, charLength) {
  const hl = document.getElementById('tts-word-highlight');
  if (!hl) return;
  const word = fullText.substring(charIndex, charIndex + (charLength || 1));
  hl.textContent = '🔊 ' + word;
  hl.style.opacity = '1';
  setTimeout(() => { if (hl) hl.style.opacity = '0'; }, 400);
}

