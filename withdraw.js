const fs = require('fs');
const generateImage = require('./withdraw-image');

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

const API_URL = 'https://ufo9.asia/getLiveStat.php';
const SHEET_API = 'https://script.google.com/macros/s/AKfycbwfJyFhGIuig_q2mEd8kxiW63wD5X8qYVr45gQDj98n3CNZLNpxKsL73v2hSONRdvbJ/exec'; // 👈 改这里
const MIN_AMOUNT = 500;

// ===== 金额处理 =====
function absAmount(value) {
  const cleaned = String(value ?? '').replace(/,/g, '').trim();
  return Math.abs(parseFloat(cleaned) || 0);
}

// ===== Caption分级系统 =====
function getCaption(amount, provider, mobile) {
  if (amount >= 5000) {
    return `🎉 <b>CONGRATULATIONS!</b>
━━━━━━━━━━━━━━
👑 <b>JACKPOT PAYOUT CONFIRMED</b>
💰 <b>AUD ${amount.toFixed(2)}</b>
🎰 ${provider}
📱 ${mobile}
━━━━━━━━━━━━━━
⚡ REAL WIN • REAL PAYOUT  
🐸 Australia Trusted Platform
🪙 Deposit 5–15s  
🪙 Withdraw 2–5min  
━━━━━━━━━━━━━━
💎 <a href="https://ufo9.asia/RFUFO9TLG">START WINNING NOW</a >`;
  }

  if (amount >= 2000) {
    return `🎉 <b>CONGRATULATIONS!</b>
━━━━━━━━━━━━━━
🚨 <b>MEGA WIN JUST PAID</b>
💰 <b>AUD ${amount.toFixed(2)}</b>
🎰 ${provider}
📱 ${mobile}
━━━━━━━━━━━━━━
⚡ Instant Withdraw • AU Trusted
🪙 Deposit 5–15s  
🪙 Withdraw 2–5min  
━━━━━━━━━━━━━━
🔥 <a href="https://ufo9.asia/RFUFO9TLG">JOIN NOW & WIN BIG</a >`;
  }

  if (amount >= 1000) {
    return `🎉 <b>CONGRATULATIONS!</b>
━━━━━━━━━━━━━━
👽 <b>UFO9 BIG WIN ALERT</b>
💰 <b>AUD ${amount.toFixed(2)}</b>
🎰 <b>${provider}</b>
📱 ${mobile}
━━━━━━━━━━━━━━
⚡ FAST PAYOUT SYSTEM  
🐸 Trusted by AU Players
🪙 Deposit 5–15s ✅  
🪙 Withdraw 2–5min ✅  
━━━━━━━━━━━━━━
🔥 <a href="https://ufo9.asia/RFUFO9TLG">CLICK NOW & WIN</a >`;
  }

  return `🎉 <b>CONGRATULATIONS!</b>
━━━━━━━━━━━━━━
👽 <b>UFO9 WIN UPDATE</b>
💰 <b>AUD ${amount.toFixed(2)}</b>
🎰 ${provider}
📱 ${mobile}
━━━━━━━━━━━━━━
⚡ Fast & Secure Payout
🪙 Deposit 5–15s  
🪙 Withdraw 2–5min  
━━━━━━━━━━━━━━
🌐 <a href="https://ufo9.asia/RFUFO9TLG">PLAY NOW</a >`;
}

// ===== 读取Sheet =====
async function getSentIds() {
  const res = await fetch(SHEET_API);
  const json = await res.json();

  if (!json.ok) throw new Error('Sheet read failed');

  return new Set((json.data || []).map(x => String(x.fid)));
}

// ===== 写入Sheet =====
async function saveToSheet(row) {
  const res = await fetch(SHEET_API, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(row)
  });

  const json = await res.json();

  if (!json.ok) throw new Error('Sheet write failed');
}

// ===== 发Telegram =====
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
  form.append('photo', new Blob([fs.readFileSync('withdraw.png')]), 'withdraw.png');

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

// ===== 主流程 =====
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

    if (json?.status !== 'SUCCESS') {
      throw new Error('API not success');
    }

    const withdraws = json?.data?.WITHDRAW || [];

    if (!withdraws.length) {
      console.log('No withdraw data');
      return;
    }

    const sentSet = await getSentIds();

    const checked = withdraws.map(w => {
      const amount = absAmount(w.cash);

      return {
        id: String(w.id || ''), // 🔥 用 id
        mobile: String(w.mobile || ''),
        amount,
        site: String(w.site || ''),
        qualifies: amount >= MIN_AMOUNT
      };
    });

    const toSend = checked.filter(x => x.qualifies && !sentSet.has(x.id));

    if (!toSend.length) {
      console.log('No new big withdraw');
      return;
    }

    const finalList = toSend.slice(0, 2);

    for (const w of finalList) {
      const data = {
        id: w.id,
        mobile: w.mobile,
        provider: w.site.toUpperCase(),
        amount: w.amount,
        time: new Date().toISOString()
      };

      await generateImage(data);

      if (!fs.existsSync('withdraw.png')) {
        throw new Error('Image not created');
      }

      const caption = getCaption(data.amount, data.provider, data.mobile);

      await sendPhoto('withdraw.png', caption);

      await saveToSheet({
        fid: data.id,
        amount: data.amount,
        mobile: data.mobile,
        provider: data.provider,
        sent_at: new Date().toISOString()
      });

      console.log('Saved:', data.id);
    }

    console.log('DONE');
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
})();
