const fs = require('fs');
const generateImage = require('./withdraw-image');

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

const API_URL = 'https://ufo9.asia/getLiveStat.php';
const SHEET_API = 'https://script.google.com/macros/s/AKfycbwfJyFhGIuig_q2mEd8kxiW63wD5X8qYVr45gQDj98n3CNZLNpxKsL73v2hSONRdvbJ/exec'; // 👈 放你的 /exec 链接
const MIN_AMOUNT = 500;

function absAmount(value) {
  const cleaned = String(value ?? '').replace(/,/g, '').trim();
  return Math.abs(parseFloat(cleaned) || 0);
}

// ✅ 读取 Sheet 已发送 ID
async function getSentIds() {
  const res = await fetch(SHEET_API);
  const json = await res.json();

  if (!json.ok) throw new Error('Sheet read failed');

  return new Set((json.data || []).map(x => String(x.fid)));
}

// ✅ 写入 Sheet
async function saveToSheet(row) {
  const res = await fetch(SHEET_API, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(row)
  });

  const json = await res.json();

  if (!json.ok) throw new Error('Sheet write failed');
}

// ✅ 发 Telegram 图片
async function sendPhoto(imagePath, caption) {
  const fileBuffer = fs.readFileSync(imagePath);

  const form = new FormData();
  const CHAT_IDS = CHAT_ID.split(',');

for (const id of CHAT_IDS) {
  const form = new FormData();
  form.append('chat_id', id.trim());
  form.append('caption', caption);
  form.append('parse_mode', 'HTML');
  form.append('disable_web_page_preview', 'true');
  form.append('photo', new Blob([fs.readFileSync('hotgame.png')]), 'hotgame.png');

  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
    method: 'POST',
    body: form
  });

  console.log(`Sent to ${id}`);
}
  form.append('caption', caption);
  form.append('parse_mode', 'HTML');
  form.append('disable_web_page_preview', 'true');
  form.append('photo', new Blob([fileBuffer]), 'withdraw.png');

  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
    method: 'POST',
    body: form
  });

  const json = await res.json();
  console.log('Telegram:', JSON.stringify(json, null, 2));

  if (!json.ok) throw new Error('Telegram send failed');
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
      throw new Error('API not success');
    }

    const withdraws = json?.data?.WITHDRAW || [];
    console.log('Total withdraw:', withdraws.length);

    if (!withdraws.length) {
      console.log('No withdraw data');
      return;
    }

    // ✅ 已发记录
    const sentSet = await getSentIds();
    console.log('Already sent count:', sentSet.size);

    // ✅ 转换 + 判断
    const checked = withdraws.map(w => {
      const amount = absAmount(w.cash);

      return {
        id: String(w.id || ''), // 🔥 关键改这里
        mobile: String(w.mobile || ''),
        amount,
        site: String(w.site || ''),
        qualifies: amount >= MIN_AMOUNT
      };
    });

    console.log('CHECKED:', JSON.stringify(checked, null, 2));

    // ✅ 筛选
    const toSend = checked.filter(x => x.qualifies && !sentSet.has(x.id));

    console.log('TO SEND:', JSON.stringify(toSend, null, 2));

    if (!toSend.length) {
      console.log('No new big withdraw');
      return;
    }

    // 👉 最多发2条
    const finalList = toSend.slice(0, 2);

    for (const w of finalList) {
      const data = {
        id: w.id,
        mobile: w.mobile,
        provider: w.site.toUpperCase(),
        amount: w.amount,
        time: new Date().toISOString()
      };

      console.log('Generating image:', data);

      await generateImage(data);

      if (!fs.existsSync('withdraw.png')) {
        throw new Error('Image not created');
      }

      const caption = `
<b>💸 WITHDRAWAL ALERT</b>

📱 ${data.mobile}
🎰 ${data.provider}
💰 AUD ${data.amount.toFixed(2)}

👉 <a href=" ">CLICK NOW</a >
`;

      await sendPhoto('withdraw.png', caption);

      // ✅ 写入 Sheet
      await saveToSheet({
        fid: data.id,
        amount: data.amount,
        mobile: data.mobile,
        provider: data.provider,
        sent_at: new Date().toISOString()
      });

      console.log('Saved to sheet:', data.id);
    }

    console.log('DONE');
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
})();
