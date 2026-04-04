const fs = require('fs');
const path = require('path');
const generateImage = require('./withdraw-image');

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

// 改成你的 live transaction API
const API_URL = 'https://ufo9au.com/getLiveStat.php';

// 最低提款金额
const MIN_AMOUNT = 500;

// 记录已发送 fid，避免重复
const SENT_FILE = path.join(__dirname, 'sent-withdraw.json');

function loadSentIds() {
  try {
    if (!fs.existsSync(SENT_FILE)) return [];
    const raw = fs.readFileSync(SENT_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to load sent file:', e.message);
    return [];
  }
}

function saveSentIds(ids) {
  fs.writeFileSync(SENT_FILE, JSON.stringify(ids.slice(-1000), null, 2), 'utf8');
}

function absAmount(value) {
  return Math.abs(Number(value || 0));
}

async function sendPhotoToTelegram(imagePath, caption) {
  const fileBuffer = fs.readFileSync(imagePath);
  const blob = new Blob([fileBuffer], { type: 'image/png' });
  const form = new FormData();

  form.append('chat_id', CHAT_ID);
  form.append('caption', caption);
  form.append('parse_mode', 'HTML');
  form.append('disable_web_page_preview', 'true');
  form.append('photo', blob, 'withdraw.png');

  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
    method: 'POST',
    body: form
  });

  const json = await res.json();
  console.log('Telegram response:', json);

  if (!json.ok) {
    throw new Error('Telegram send failed: ' + JSON.stringify(json));
  }
}

(async () => {
  try {
    if (!BOT_TOKEN || !CHAT_ID) {
      throw new Error('Missing BOT_TOKEN or CHAT_ID');
    }

    console.log('Fetching live stat...');
    const res = await fetch(API_URL, {
      method: 'GET',
      headers: {
        'accept': '*/*'
      }
    });

    const json = await res.json();
    console.log('API status:', json?.status);

    if (json?.status !== 'SUCCESS' || !json?.data?.WITHDRAW) {
      throw new Error('Invalid API response');
    }

    const withdraws = Array.isArray(json.data.WITHDRAW) ? json.data.WITHDRAW : [];
    console.log('Withdraw rows:', withdraws.length);

    const sentIds = loadSentIds();
    const sentSet = new Set(sentIds);

    const bigWithdraws = withdraws.filter(w => {
      const amount = absAmount(w.cash);
      return amount >= MIN_AMOUNT && !sentSet.has(String(w.fid));
    });

    console.log('Qualified withdraw rows:', bigWithdraws.length);

    if (!bigWithdraws.length) {
      console.log('No new big withdraws, exit.');
      return;
    }

    for (const w of bigWithdraws) {
      const amount = absAmount(w.cash).toFixed(2);

      const data = {
        id: String(w.fid || ''),
        mobile: String(w.mobile || 'UNKNOWN'),
        provider: String(w.site || 'UNKNOWN').toUpperCase(),
        amount: Number(amount),
        time: new Date().toISOString()
      };

      console.log('Generating image for:', data);

      await generateImage(data);

      if (!fs.existsSync('withdraw.png')) {
        throw new Error('withdraw.png was not created');
      }

      const caption = `
<b>💸 WITHDRAWAL ALERT</b>

📱 ${data.mobile}
🎰 ${data.provider}
💰 AUD ${amount}

👉 <a href=" ">CLICK NOW</a >
`;

      await sendPhotoToTelegram('withdraw.png', caption);

      sentSet.add(String(w.fid));
      console.log(`Sent fid ${w.fid}`);
    }

    saveSentIds(Array.from(sentSet));
    console.log('✅ Withdraw bot finished successfully');

  } catch (err) {
    console.error('❌ ERROR:', err.message);
    process.exit(1);
  }
})();
