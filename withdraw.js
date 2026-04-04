const fs = require('fs');
const path = require('path');
const generateImage = require('./withdraw-image');

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

const API_URL = 'https://ufo9.asia/getLiveStat.php';
const MIN_AMOUNT = 500;

// 👉 注意：GitHub不会长期保存，但先保留结构
const SENT_FILE = path.join(__dirname, 'sent-withdraw.json');

function loadSentIds() {
  try {
    if (!fs.existsSync(SENT_FILE)) return [];
    const raw = fs.readFileSync(SENT_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function saveSentIds(ids) {
  fs.writeFileSync(SENT_FILE, JSON.stringify(ids.slice(-1000), null, 2));
}

function absAmount(value) {
  return Math.abs(Number(value || 0));
}

async function sendPhoto(imagePath, caption) {
  const fileBuffer = fs.readFileSync(imagePath);
  const form = new FormData();

  form.append('chat_id', CHAT_ID);
  form.append('caption', caption);
  form.append('parse_mode', 'HTML');
  form.append('disable_web_page_preview', 'true');
  form.append('photo', new Blob([fileBuffer]), 'withdraw.png');

  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
    method: 'POST',
    body: form
  });

  const json = await res.json();
  console.log('Telegram result:', json);

  if (!json.ok) {
    throw new Error('Telegram send failed');
  }
}

(async () => {
  try {
    console.log('Fetching live stat...');

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'referer': 'https://ufo9.asia/'
      },
      body: 'background=1&mId=879'
    });

    const json = await res.json();
    console.log('FULL API:', JSON.stringify(json, null, 2));

    if (json?.status !== 'SUCCESS') {
      throw new Error('API status not SUCCESS');
    }

    const withdraws = json?.data?.WITHDRAW || [];

    console.log(
      'WITHDRAW LIST:',
      withdraws.map(w => ({
        fid: w.fid,
        mobile: w.mobile,
        cash: w.cash,
        site: w.site
      }))
    );

    const sentIds = loadSentIds();
    const sentSet = new Set(sentIds);

    const bigWithdraws = withdraws.filter(w => {
      const amount = absAmount(w.cash);

      console.log(
        'CHECK:',
        w.fid,
        w.mobile,
        w.cash,
        '→',
        amount,
        '>=500?',
        amount >= MIN_AMOUNT
      );

      return amount >= MIN_AMOUNT && !sentSet.has(String(w.fid));
    });

    console.log('Qualified:', bigWithdraws.length);

    if (!bigWithdraws.length) {
      console.log('No new big withdraw');
      return;
    }

    // 👉 每次最多发2条，避免刷屏
    const toSend = bigWithdraws.slice(0, 2);

    for (const w of toSend) {
      const amount = absAmount(w.cash).toFixed(2);

      const data = {
        id: String(w.fid || ''),
        mobile: String(w.mobile || ''),
        provider: String(w.site || '').toUpperCase(),
        amount: Number(amount),
        time: new Date().toISOString()
      };

      console.log('Generating image for:', data);

      await generateImage(data);

      if (!fs.existsSync('withdraw.png')) {
        throw new Error('Image not created');
      }

      const caption = `
<b>💸 WITHDRAWAL ALERT</b>

📱 ${data.mobile}
🎰 ${data.provider}
💰 AUD ${amount}

👉 <a href=" ">CLICK NOW</a >
`;

      await sendPhoto('withdraw.png', caption);

      sentSet.add(String(w.fid));
    }

    saveSentIds(Array.from(sentSet));

    console.log('DONE');

  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
})();
