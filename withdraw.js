const fs = require('fs');
const generateImage = require('./withdraw-image');

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

const API_URL = 'https://ufo9.asia/getLiveStat.php';
const SHEET_API = 'https://script.google.com/macros/s/AKfycbwfJyFhGIuig_q2mEd8kxiW63wD5X8qYVr45gQDj98n3CNZLNpxKsL73v2hSONRdvbJ/exec';
const MIN_AMOUNT = 500;

function absAmount(value) {
  const cleaned = String(value ?? '').replace(/,/g, '').trim();
  return Math.abs(parseFloat(cleaned) || 0);
}

async function getSentIdsFromSheet() {
  const res = await fetch(SHEET_API);
  const json = await res.json();

  if (!json.ok) {
    throw new Error('Failed to read sheet');
  }

  return new Set((json.data || []).map(x => String(x.fid || '')));
}

async function appendSentToSheet(row) {
  const res = await fetch(SHEET_API, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(row)
  });

  const json = await res.json();

  if (!json.ok) {
    throw new Error('Failed to write sheet');
  }
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
  console.log('Telegram result:', JSON.stringify(json, null, 2));

  if (!json.ok) {
    throw new Error('Telegram send failed');
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

    const withdraws = Array.isArray(json?.data?.WITHDRAW) ? json.data.WITHDRAW : [];
    console.log('Withdraw rows total:', withdraws.length);

    if (!withdraws.length) {
      console.log('No withdraw rows returned by API.');
      return;
    }

    const sentSet = await getSentIdsFromSheet();
    console.log('Sent IDs from sheet:', sentSet.size);

    const checked = withdraws.map(w => {
      const amount = absAmount(w.cash);
      const qualifies = amount >= MIN_AMOUNT;

      return {
        fid: String(w.fid || ''),
        mobile: String(w.mobile || ''),
        cash_raw: String(w.cash || ''),
        amount,
        site: String(w.site || ''),
        qualifies
      };
    });

    console.log('CHECKED ROWS:', JSON.stringify(checked, null, 2));

    const bigWithdraws = checked.filter(x => x.qualifies && !sentSet.has(x.fid));
    console.log('Qualified rows:', JSON.stringify(bigWithdraws, null, 2));

    if (!bigWithdraws.length) {
      console.log(`No new withdraw >= ${MIN_AMOUNT}`);
      return;
    }

    const toSend = bigWithdraws.slice(0, 2);

    for (const w of toSend) {
      const data = {
        id: w.fid,
        mobile: w.mobile,
        provider: (w.site || 'UNKNOWN').toUpperCase(),
        amount: w.amount,
        time: new Date().toISOString()
      };

      console.log('Generating image with:', JSON.stringify(data, null, 2));
      await generateImage(data);

      if (!fs.existsSync('withdraw.png')) {
        throw new Error('withdraw.png not created');
      }

      const caption = `
<b>💸 WITHDRAWAL ALERT</b>

📱 ${data.mobile}
🎰 ${data.provider}
💰 AUD ${data.amount.toFixed(2)}

👉 <a href=" ">CLICK NOW</a >
`;

      await sendPhoto('withdraw.png', caption);

      await appendSentToSheet({
        fid: w.fid,
        amount: w.amount,
        mobile: w.mobile,
        provider: w.site,
        sent_at: new Date().toISOString()
      });

      console.log('Saved to sheet:', w.fid);
    }

    console.log('DONE');
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
})();
