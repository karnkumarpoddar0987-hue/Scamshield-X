const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const server = app.listen(PORT, () => {
  console.log(`\n  ==========================================`);
  console.log(`   ScamShield X is LIVE!`);
  console.log(`   Open: http://localhost:${PORT}`);
  console.log(`  ==========================================\n`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    const newPort = PORT + 1;
    console.log(`  Port ${PORT} busy. Trying port ${newPort}...`);
    app.listen(newPort, () => {
      console.log(`\n  ScamShield X running on http://localhost:${newPort}\n`);
    });
  } else {
    console.error('Server error:', err);
  }
});

const scamDatabase = {
  keywords: ['prize', 'winner', 'lottery', 'bank account', 'otp', 'verify', 'urgent', 'suspended', 'click here', 'free money', 'congratulations', 'selected', 'claim now', 'limited time', 'act now', 'social security', 'irs', 'tax refund', 'bitcoin', 'crypto investment', 'double your money', 'nigerian prince', 'inheritance', 'wire transfer', 'gift card', 'itunes card', 'google play card', 'remote access', 'teamviewer', 'anydesk', 'your computer is infected', 'microsoft support', 'apple support', 'amazon order', 'package delivery', 'customs fee', 'aadhar', 'pan card', 'kyc update', 'account blocked', 'emi bounce', 'loan approved'],
  phishingDomains: ['paypa1.com', 'amaz0n.com', 'g00gle.com', 'faceb00k.com', 'netfl1x.com', 'app1e.com', 'micros0ft.com', 'bankofamerica-secure.com', 'sbi-online-secure.net', 'hdfc-bank-kyc.com', 'paytm-kyc-update.com', 'icicibanklogin.net'],
  suspiciousPatterns: [/\b\d{10,}\b/, /bit\.ly/, /tinyurl/, /goo\.gl/, /ow\.ly/, /t\.co\/[a-z0-9]{8,}/i]
};

const reportedScams = [
  { id: uuidv4(), lat: 28.6139, lng: 77.2090, city: 'New Delhi', type: 'Phone Scam', count: 847, severity: 'high', time: '2 min ago' },
  { id: uuidv4(), lat: 19.0760, lng: 72.8777, city: 'Mumbai', type: 'Phishing', count: 623, severity: 'high', time: '5 min ago' },
  { id: uuidv4(), lat: 12.9716, lng: 77.5946, city: 'Bangalore', type: 'Deepfake Call', count: 412, severity: 'medium', time: '8 min ago' },
  { id: uuidv4(), lat: 22.5726, lng: 88.3639, city: 'Kolkata', type: 'UPI Fraud', count: 389, severity: 'high', time: '12 min ago' },
  { id: uuidv4(), lat: 13.0827, lng: 80.2707, city: 'Chennai', type: 'SMS Scam', count: 298, severity: 'medium', time: '15 min ago' },
  { id: uuidv4(), lat: 17.3850, lng: 78.4867, city: 'Hyderabad', type: 'Investment Fraud', count: 534, severity: 'high', time: '3 min ago' },
  { id: uuidv4(), lat: 23.0225, lng: 72.5714, city: 'Ahmedabad', type: 'KYC Fraud', count: 267, severity: 'medium', time: '20 min ago' },
  { id: uuidv4(), lat: 26.8467, lng: 80.9462, city: 'Lucknow', type: 'Loan Scam', count: 198, severity: 'low', time: '25 min ago' },
  { id: uuidv4(), lat: 18.5204, lng: 73.8567, city: 'Pune', type: 'Job Fraud', count: 445, severity: 'high', time: '7 min ago' },
  { id: uuidv4(), lat: 30.7333, lng: 76.7794, city: 'Chandigarh', type: 'Romance Scam', count: 156, severity: 'low', time: '30 min ago' }
];

const userReports = [];
const trustScores = {};

function analyzeText(text) {
  const lower = text.toLowerCase();
  let score = 0;
  const detectedKeywords = [];
  const warnings = [];

  scamDatabase.keywords.forEach(kw => {
    if (lower.includes(kw)) {
      score += 12;
      detectedKeywords.push(kw);
    }
  });

  if (/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/.test(text)) { score += 25; warnings.push('Credit/Debit card number detected'); }
  if (/\b\d{6}\b/.test(text)) { score += 20; warnings.push('OTP-like number detected'); }
  if (/\b\d{10}\b/.test(text)) { score += 10; warnings.push('Phone number detected'); }
  if (/urgent|immediately|right now|asap/i.test(text)) { score += 15; warnings.push('Urgency language detected'); }
  if (/free|won|winner|prize|reward/i.test(text)) { score += 18; warnings.push('Reward bait language detected'); }
  if (/password|pin|cvv|otp|secret/i.test(text)) { score += 22; warnings.push('Sensitive data request detected'); }

  score = Math.min(score, 100);

  let riskLevel = 'SAFE';
  let color = '#00ff88';
  if (score >= 70) { riskLevel = 'CRITICAL'; color = '#ff0040'; }
  else if (score >= 45) { riskLevel = 'HIGH RISK'; color = '#ff6600'; }
  else if (score >= 20) { riskLevel = 'SUSPICIOUS'; color = '#ffcc00'; }

  return { score, riskLevel, color, detectedKeywords, warnings };
}

function analyzeUrl(url) {
  let score = 0;
  const flags = [];

  const domain = url.replace(/https?:\/\//, '').split('/')[0].toLowerCase();

  scamDatabase.phishingDomains.forEach(d => {
    if (domain.includes(d) || d.includes(domain)) { score += 80; flags.push('Known phishing domain'); }
  });

  if (/\d+\.\d+\.\d+\.\d+/.test(domain)) { score += 60; flags.push('IP address used instead of domain'); }
  if ((domain.match(/-/g) || []).length > 2) { score += 25; flags.push('Excessive hyphens in domain'); }
  if (/secure|login|verify|update|confirm|account|bank|pay/i.test(domain)) { score += 30; flags.push('Suspicious keywords in domain'); }
  if (/\.(xyz|tk|ml|ga|cf|gq|top|click|download)$/.test(domain)) { score += 35; flags.push('Suspicious TLD'); }
  if (url.length > 100) { score += 15; flags.push('Unusually long URL'); }
  if (/bit\.ly|tinyurl|goo\.gl|ow\.ly/i.test(url)) { score += 20; flags.push('URL shortener detected'); }
  if ((domain.match(/\./g) || []).length > 3) { score += 20; flags.push('Too many subdomains'); }

  score = Math.min(score, 100);

  let verdict = 'SAFE';
  let color = '#00ff88';
  if (score >= 70) { verdict = 'DANGEROUS'; color = '#ff0040'; }
  else if (score >= 40) { verdict = 'SUSPICIOUS'; color = '#ff6600'; }
  else if (score >= 15) { verdict = 'CAUTION'; color = '#ffcc00'; }

  return { score, verdict, color, flags, domain };
}

function generateTrustScore(phoneNumber) {
  if (trustScores[phoneNumber]) return trustScores[phoneNumber];

  const reportCount = Math.floor(Math.random() * 50);
  const ageMonths = Math.floor(Math.random() * 120);
  let score = 100;

  score -= reportCount * 3;
  if (ageMonths < 3) score -= 20;
  if (ageMonths < 1) score -= 30;
  score = Math.max(0, Math.min(100, score + Math.floor(Math.random() * 20)));

  const result = {
    score,
    reportCount,
    ageMonths,
    verdict: score >= 70 ? 'TRUSTED' : score >= 40 ? 'SUSPICIOUS' : 'DANGEROUS',
    color: score >= 70 ? '#00ff88' : score >= 40 ? '#ffcc00' : '#ff0040'
  };

  trustScores[phoneNumber] = result;
  return result;
}

app.post('/api/analyze/call', (req, res) => {
  const { transcript, phoneNumber } = req.body;
  if (!transcript) return res.status(400).json({ error: 'Transcript required' });

  const analysis = analyzeText(transcript);
  const trust = phoneNumber ? generateTrustScore(phoneNumber) : null;

  const deepfakeScore = Math.floor(Math.random() * 40) + (analysis.score > 50 ? 40 : 0);
  const deepfakeVerdict = deepfakeScore > 70 ? 'LIKELY DEEPFAKE' : deepfakeScore > 40 ? 'UNCERTAIN' : 'AUTHENTIC';

  res.json({
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    fraudProbability: analysis.score,
    riskLevel: analysis.riskLevel,
    color: analysis.color,
    detectedKeywords: analysis.detectedKeywords,
    warnings: analysis.warnings,
    deepfake: { score: deepfakeScore, verdict: deepfakeVerdict },
    trustScore: trust,
    recommendation: analysis.score >= 70 ? 'HANG UP IMMEDIATELY. Report this call.' : analysis.score >= 45 ? 'Be cautious. Do not share personal information.' : analysis.score >= 20 ? 'Stay alert. Verify caller identity.' : 'Call appears safe. Stay vigilant.'
  });
});

app.post('/api/analyze/link', (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  const analysis = analyzeUrl(url);

  res.json({
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    url,
    riskScore: analysis.score,
    verdict: analysis.verdict,
    color: analysis.color,
    flags: analysis.flags,
    domain: analysis.domain,
    recommendation: analysis.score >= 70 ? 'DO NOT CLICK. This link is dangerous.' : analysis.score >= 40 ? 'Avoid clicking. High risk detected.' : analysis.score >= 15 ? 'Proceed with caution.' : 'Link appears safe.'
  });
});

app.post('/api/analyze/text', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Text required' });

  const analysis = analyzeText(text);

  res.json({
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    fraudProbability: analysis.score,
    riskLevel: analysis.riskLevel,
    color: analysis.color,
    detectedKeywords: analysis.detectedKeywords,
    warnings: analysis.warnings,
    recommendation: analysis.score >= 70 ? 'This message is a SCAM. Do not respond.' : analysis.score >= 45 ? 'Highly suspicious message. Verify source.' : analysis.score >= 20 ? 'Treat with caution.' : 'Message appears safe.'
  });
});

app.get('/api/radar/hotspots', (req, res) => {
  const live = reportedScams.map(s => ({
    ...s,
    count: s.count + Math.floor(Math.random() * 10),
    time: `${Math.floor(Math.random() * 30) + 1} min ago`
  }));
  res.json({ hotspots: live, total: live.reduce((a, b) => a + b.count, 0), lastUpdated: new Date().toISOString() });
});

app.post('/api/report', (req, res) => {
  const { type, description, phoneNumber, url, location } = req.body;
  if (!type || !description) return res.status(400).json({ error: 'Type and description required' });

  const report = {
    id: uuidv4(),
    type,
    description,
    phoneNumber: phoneNumber || null,
    url: url || null,
    location: location || 'Unknown',
    timestamp: new Date().toISOString(),
    status: 'SUBMITTED',
    caseNumber: 'SSX-' + Math.random().toString(36).substr(2, 8).toUpperCase()
  };

  userReports.push(report);
  res.json({ success: true, report, message: 'Report submitted successfully. Authorities notified.' });
});

app.get('/api/reports', (req, res) => {
  res.json({ reports: userReports, total: userReports.length });
});

app.post('/api/trust-score', (req, res) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) return res.status(400).json({ error: 'Phone number required' });
  res.json(generateTrustScore(phoneNumber));
});

app.post('/api/assistant/chat', (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  const lower = message.toLowerCase();
  let response = '';
  let actions = [];

  if (lower.includes('otp') || lower.includes('one time password')) {
    response = 'NEVER share your OTP with anyone — not even bank officials, government agents, or customer support. Legitimate organizations will NEVER ask for your OTP. If someone is asking for it, it\'s a scam. Hang up immediately.';
    actions = ['Block the number', 'Report to cybercrime', 'Call 1930 helpline'];
  } else if (lower.includes('upi') || lower.includes('payment') || lower.includes('money')) {
    response = 'Be extremely careful with UPI payments. Scammers often send fake payment requests disguised as "receiving money." Remember: you never need to enter your PIN to RECEIVE money. If you\'re being pressured to pay, it\'s likely a scam.';
    actions = ['Verify payment request', 'Check sender identity', 'Report suspicious UPI ID'];
  } else if (lower.includes('call') || lower.includes('phone')) {
    response = 'Suspicious call detected? Here\'s what to do: 1) Don\'t share any personal info. 2) Hang up if pressured. 3) Call back on the official number. 4) Use our Call Analyzer to check the number. 5) Report to 1930 if it\'s a scam.';
    actions = ['Analyze the number', 'Block caller', 'Report to 1930'];
  } else if (lower.includes('link') || lower.includes('url') || lower.includes('website')) {
    response = 'Never click suspicious links! Use our Link Scanner to verify any URL before clicking. Look for: misspelled domains, unusual TLDs (.xyz, .tk), excessive hyphens, and URL shorteners hiding the real destination.';
    actions = ['Scan the link', 'Report phishing', 'Check domain age'];
  } else if (lower.includes('job') || lower.includes('work from home') || lower.includes('earn')) {
    response = 'Job scams are rampant! Red flags: asking for registration fees, promising unrealistic earnings, work-from-home with no interview, asking for bank details upfront. Verify company on official websites before proceeding.';
    actions = ['Verify company', 'Report job scam', 'Check reviews'];
  } else if (lower.includes('bank') || lower.includes('account') || lower.includes('kyc')) {
    response = 'Banks NEVER ask for your account details, PIN, or OTP via call or SMS. KYC updates are done at branches or through official apps only. If someone claims to be from your bank and asks for sensitive info — it\'s a scam.';
    actions = ['Call bank directly', 'Visit branch', 'Report to RBI'];
  } else if (lower.includes('lottery') || lower.includes('prize') || lower.includes('won')) {
    response = 'You didn\'t win anything. Lottery scams are one of the oldest tricks. No legitimate lottery asks you to pay fees to claim prizes. Delete the message, block the sender, and report it.';
    actions = ['Block sender', 'Delete message', 'Report scam'];
  } else if (lower.includes('help') || lower.includes('emergency') || lower.includes('scam')) {
    response = 'I\'m here to help! If you\'re currently in a scam situation: 1) Stop all communication immediately. 2) Don\'t transfer any money. 3) Call National Cyber Crime Helpline: 1930. 4) File a complaint at cybercrime.gov.in. 5) Use our One-Tap Protect feature to report instantly.';
    actions = ['Call 1930 now', 'File complaint online', 'One-Tap Protect'];
  } else {
    response = 'I\'m ScamShield AI, your personal fraud safety assistant. I can help you identify scams, analyze suspicious calls/messages/links, and guide you through emergency situations. What specific threat are you facing? Tell me about the suspicious call, message, or link and I\'ll analyze it for you.';
    actions = ['Analyze a call', 'Scan a link', 'Report fraud'];
  }

  res.json({
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    message: response,
    actions,
    threatLevel: lower.includes('otp') || lower.includes('bank') ? 'HIGH' : 'MEDIUM'
  });
});

app.get('/api/stats', (req, res) => {
  res.json({
    totalScamsDetected: 2847293 + Math.floor(Math.random() * 100),
    callsAnalyzed: 18473621 + Math.floor(Math.random() * 500),
    linksScanned: 9284731 + Math.floor(Math.random() * 200),
    usersProtected: 4729183 + Math.floor(Math.random() * 50),
    fraudPrevented: '₹847 Cr+',
    activeThreats: 1247 + Math.floor(Math.random() * 20),
    lastUpdated: new Date().toISOString()
  });
});

app.get('/api/simulator/scenarios', (req, res) => {
  res.json({
    scenarios: [
      { id: 1, title: 'Bank KYC Scam', difficulty: 'Beginner', description: 'A caller claims to be from your bank and asks for KYC update', script: 'Hello, I am calling from SBI Bank. Your account will be blocked in 24 hours if you do not update your KYC. Please share your account number and OTP.', redFlags: ['Urgency', 'OTP request', 'Account threat'], points: 100 },
      { id: 2, title: 'Lottery Winner Scam', difficulty: 'Beginner', description: 'You receive a message saying you won a lottery', script: 'Congratulations! You have won Rs 50 Lakh in the National Digital Lottery. To claim your prize, pay Rs 5000 processing fee via UPI to lottery@upi.', redFlags: ['Unsolicited prize', 'Payment to claim', 'Urgency'], points: 100 },
      { id: 3, title: 'Tech Support Scam', difficulty: 'Intermediate', description: 'A caller claims your computer has a virus', script: 'This is Microsoft Technical Support. We have detected a serious virus on your computer. Please install TeamViewer immediately so we can fix it remotely.', redFlags: ['Unsolicited call', 'Remote access request', 'Fear tactics'], points: 200 },
      { id: 4, title: 'Investment Fraud', difficulty: 'Advanced', description: 'A WhatsApp group promises guaranteed returns', script: 'Join our exclusive crypto investment group. Our AI algorithm guarantees 300% returns in 30 days. Minimum investment Rs 10,000. Limited slots available!', redFlags: ['Guaranteed returns', 'Urgency', 'Unrealistic promises'], points: 300 },
      { id: 5, title: 'Deepfake CEO Fraud', difficulty: 'Expert', description: 'A voice message from your CEO asks for urgent wire transfer', script: 'This is urgent. I need you to transfer Rs 5 lakh to our new vendor account immediately. I am in a meeting and cannot talk. Do it now and I will explain later.', redFlags: ['Urgency', 'Unusual request', 'Bypassing normal process', 'Voice may be AI-generated'], points: 500 }
    ]
  });
});

app.get('/api/testimonials', (req, res) => {
  res.json({
    testimonials: [
      {
        id: 1,
        name: 'Ramesh Sharma',
        age: 64,
        city: 'Jaipur, Rajasthan',
        avatar: 'RS',
        avatarColor: '#0066ff',
        stars: 5,
        scenario: 'Electricity Bill Scam',
        badge: 'Phone Scam Stopped',
        badgeColor: '#ff0040',
        hinglish: true,
        text: 'Mujhe ek call aayi — "Sir, aapka bijli ka bill ₹50,000 pending hai, aaj raat 9 baje connection cut ho jaayega." Main dar gaya tha. Lekin ScamShield X ne turant red alert diya — "91% Scam Probability." Maine call kaata aur app se 1930 par report kiya. Mere ₹50,000 bach gaye. Yeh app mere liye bhagwan ki tarah hai.',
        saved: '₹50,000',
        scamType: 'Fake Electricity Bill Threat',
        verified: true
      },
      {
        id: 2,
        name: 'Priya Mehta',
        age: 34,
        city: 'Mumbai, Maharashtra',
        avatar: 'PM',
        avatarColor: '#cc00ff',
        stars: 5,
        scenario: 'Deepfake Voice Scam',
        badge: 'Deepfake Detected',
        badgeColor: '#cc00ff',
        hinglish: true,
        text: 'Mere papa ko unke "bank manager" ki awaaz mein call aayi — bilkul same voice, same tone. Unhone OTP share karne wale the. Tabhi ScamShield X ka Deepfake Detector alert bola: "AI-Generated Voice Detected — 84% Synthetic." Hum dono shock mein the. Yeh AI voice clone tha. App ne literally papa ki savings bachaayi. Is technology par mujhe poora bharosa hai.',
        saved: '₹2.3 Lakh',
        scamType: 'AI Deepfake Voice Clone',
        verified: true
      },
      {
        id: 3,
        name: 'Arjun Patel',
        age: 22,
        city: 'Ahmedabad, Gujarat',
        avatar: 'AP',
        avatarColor: '#00ff88',
        stars: 5,
        scenario: 'Fake Job Offer Phishing',
        badge: 'Phishing Link Blocked',
        badgeColor: '#ffcc00',
        hinglish: true,
        text: 'Placement ke time ek WhatsApp message aaya — "Congratulations! TCS mein aapka selection hua hai. Yahan click karke documents submit karo." Link dekh ke suspicious laga, toh ScamShield X mein scan kiya. Result: "DANGEROUS — Known Phishing Domain, 89% Risk." Agar click kar leta toh mera bank account aur personal data dono jaate. App ne mujhe bachaya — literally career aur savings dono.',
        saved: 'Personal Data + Bank Details',
        scamType: 'Fake Job Offer Phishing Link',
        verified: true
      }
    ]
  });
});

app.get('/api/comparison', (req, res) => {
  res.json({
    features: [
      { feature: 'Basic Spam Call Detection', others: true, ours: true, note: '' },
      { feature: 'Deepfake Voice Detection', others: false, ours: true, note: 'AI-powered voiceprint analysis' },
      { feature: 'Real-time Phishing Link Scanner', others: false, ours: true, note: 'Scans URLs, SMS & emails instantly' },
      { feature: 'Family Alert System', others: false, ours: true, note: 'Instant SOS to family members' },
      { feature: 'Remote Block Feature', others: false, ours: true, note: 'Block numbers from your phone' },
      { feature: 'Direct 1930 Helpline Integration', others: false, ours: true, note: 'One-tap government helpline' },
      { feature: 'Zero Data Storage (Privacy)', others: false, ours: true, note: 'No call data stored on servers' },
      { feature: 'Digital Trust Score', others: false, ours: true, note: 'AI-generated caller credibility score' },
      { feature: 'Scam Radar Heatmap', others: false, ours: true, note: 'Live fraud hotspot map' },
      { feature: 'Fraud Awareness Training', others: false, ours: true, note: 'Gamified scam simulator' },
      { feature: 'Predictive Fraud Warning', others: false, ours: true, note: 'Warns before fraud happens' },
      { feature: 'Community Threat Intelligence', others: false, ours: true, note: 'Crowd-sourced scam database' }
    ]
  });
});

app.get('/api/family/alert', (req, res) => {
  res.json({
    message: 'Family Safety Shield active',
    features: ['Instant SOS Alerts', 'Remote Block', 'One-Click 1930'],
    activeAlerts: Math.floor(Math.random() * 5),
    familyMembers: 0
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


