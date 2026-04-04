const fs = require('fs');
const path = require('path');
const generateImage = require('./withdraw-image');

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

const API_URL = 'https://ufo9.asia/getLiveStat.php';
const MIN_AMOUNT = 500;
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
  fs.writeFileSync(
    SENT_FILE,
    JSON.stringify(ids.slice(-1000), null, 2),
    'utf8'
  );
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
      method: 'POST',
      headers: {
        accept: '*/*',
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        referer: 'https://ufo9.asia/'
      },
      body: 'background=1&mId=879'
    });

    const json = await res.json();
    console.log('FULL API:', JSON.stringify(json, null, 2));

    if (json?.status !== 'SUCCESS') {
      throw new Error('API status not SUCCESS');
    }

    const data = json?.data;
    if (!data || Array.isArray(data)) {
      console.log('No valid withdraw structure returned, exit.');
      return;
    }

    const withdraws = Array.isArray(data.WITHDRAW) ? data.WITHDRAW : [];
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

      const dataForImage = {
        id: String(w.fid || ''),
        mobile: String(w.mobile || 'UNKNOWN'),
        provider: String(w.site || 'UNKNOWN').toUpperCase(),
        amount: Number(amount),
        time: new Date().toISOString()
      };

      console.log('Generating image for:', dataForImage);

      await generateImage(dataForImage);

      if (!fs.existsSync('withdraw.png')) {
        throw new Error('withdraw.png was not created');
      }

      const caption = `
<b>💸 WITHDRAWAL ALERT</b>

📱 ${dataForImage.mobile}
🎰 ${dataForImage.provider}
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
