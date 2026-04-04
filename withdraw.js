const fs = require('fs');
const { createCanvas } = require('canvas');

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

function formatSydneyTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleString('en-AU', {
    timeZone: 'Australia/Sydney',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function safeAmount(value) {
  return Math.abs(Number(value || 0)).toFixed(2);
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function generateWithdrawImage(data) {
  const width = 900;
  const height = 520;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#0f172a');
  bg.addColorStop(1, '#020617');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(140, 90, 10, 140, 90, 280);
  glow.addColorStop(0, 'rgba(34,197,94,0.22)');
  glow.addColorStop(1, 'rgba(34,197,94,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  drawRoundedRect(ctx, 35, 35, width - 70, height - 70, 24);
  ctx.fillStyle = 'rgba(255,255,255,0.045)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.fillStyle = '#22c55e';
  ctx.font = 'bold 22px Arial';
  ctx.fillText('WITHDRAWAL SUCCESSFUL', 70, 95);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 58px Arial';
  ctx.fillText(`AUD ${safeAmount(data.amount)}`, 70, 175);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '20px Arial';
  ctx.fillText('Mobile', 70, 255);
  ctx.fillText('Provider', 70, 310);
  ctx.fillText('Time', 70, 365);
  ctx.fillText('Transaction ID', 70, 420);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 26px Arial';
  ctx.fillText(data.mobile || 'UNKNOWN', 230, 255);
  ctx.fillText(data.provider || 'UNKNOWN', 230, 310);
  ctx.fillText(formatSydneyTime(data.time), 230, 365);
  ctx.fillText(String(data.id || 'UNKNOWN'), 230, 420);

  drawRoundedRect(ctx, width - 230, 75, 120, 120, 18);
  ctx.fillStyle = 'rgba(34,197,94,0.12)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(34,197,94,0.34)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#22c55e';
  ctx.font = 'bold 54px Arial';
  ctx.fillText('✓', width - 187, 153);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '18px Arial';
  ctx.fillText('Trusted payout alert', 70, 470);

  fs.writeFileSync('withdraw.png', canvas.toBuffer('image/png'));
}

async function sendToTelegram(imagePath, caption) {
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
    throw new Error(JSON.stringify(json));
  }
}

(async () => {
  try {
    if (!BOT_TOKEN || !CHAT_ID) {
      throw new Error('Missing BOT_TOKEN or CHAT_ID');
    }

    const testData = {
      id: '15760402443',
      mobile: '61******729',
      provider: 'JILI',
      amount: '-500.59',
      time: '2026-04-04T06:59:28+00:00'
    };

    generateWithdrawImage(testData);

    if (!fs.existsSync('withdraw.png')) {
      throw new Error('withdraw.png was not created');
    }

    const caption = `
<b>💸 WITHDRAWAL ALERT</b>

📱 ${testData.mobile}
🎰 ${testData.provider}
💰 AUD ${safeAmount(testData.amount)}

👉 <a href=" ">CLICK NOW</a >
`;

    await sendToTelegram('withdraw.png', caption);

    console.log('✅ Withdraw image test sent successfully');
  } catch (err) {
    console.error('❌ ERROR:', err.message);
    process.exit(1);
  }
})();
