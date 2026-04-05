const fs = require('fs');
const generateImage = require('./withdraw-image');

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

const TX_ID = String(process.env.TX_ID || '');
const TX_AMOUNT = Number(process.env.TX_AMOUNT || 0);
const TX_MOBILE = String(process.env.TX_MOBILE || '');
const TX_PROVIDER = String(process.env.TX_PROVIDER || '');
const TX_TIME = String(process.env.TX_TIME || new Date().toISOString());

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

async function sendPhoto(imagePath, caption) {
  const chatIds = String(CHAT_ID || '')
    .split(',')
    .map(x => x.trim())
    .filter(Boolean);

  if (!chatIds.length) {
    throw new Error('No valid chat_id found');
  }

  const fileBuffer = fs.readFileSync(imagePath);

  for (const id of chatIds) {
    const form = new FormData();
    form.append('chat_id', id);
    form.append('caption', caption);
    form.append('parse_mode', 'HTML');
    form.append('disable_web_page_preview', 'true');
    form.append('photo', new Blob([fileBuffer], { type: 'image/png' }), 'withdraw.png');

    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      body: form
    });

    const json = await res.json();
    if (!json.ok) {
      throw new Error(`Telegram send failed for ${id}: ${JSON.stringify(json)}`);
    }

    console.log(`Sent to ${id}`);
  }
}

(async () => {
  try {
    if (!BOT_TOKEN || !CHAT_ID) {
      throw new Error('Missing BOT_TOKEN or CHAT_ID');
    }

    if (!TX_ID || !TX_AMOUNT || !TX_MOBILE || !TX_PROVIDER) {
      throw new Error('Missing workflow input');
    }

    const data = {
      id: TX_ID,
      mobile: TX_MOBILE,
      provider: TX_PROVIDER.toUpperCase(),
      amount: TX_AMOUNT,
      time: TX_TIME
    };

    await generateImage(data);

    if (!fs.existsSync('withdraw.png')) {
      throw new Error('Image not created');
    }

    const caption = getCaption(data.amount, data.provider, data.mobile);
    await sendPhoto('withdraw.png', caption);

    console.log('DONE');
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
})();
