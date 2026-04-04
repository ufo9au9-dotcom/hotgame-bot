const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');

const UFO_LOGO = 'https://static.gwvkyk.com/media/82d608b3d0d966ec2d7b6.png';
const PROVIDER_LOGOS = {
  JILI: 'https://static.gwvkyk.com/media/808802e3a0d960ec3ed7d.png'
};

function maskPhone(phone) {
  if (!phone) return 'UNKNOWN';
  return String(phone);
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString('en-AU', {
    timeZone: 'Australia/Sydney',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

async function generateImage(data) {
  const canvas = createCanvas(900, 520);
  const ctx = canvas.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, 900, 520);
  bg.addColorStop(0, '#0f172a');
  bg.addColorStop(1, '#1e1b4b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 900, 520);

  const glow = ctx.createRadialGradient(450, 260, 50, 450, 260, 400);
  glow.addColorStop(0, 'rgba(99,102,241,0.28)');
  glow.addColorStop(1, 'rgba(99,102,241,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 900, 520);

  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(40, 40, 820, 440);

  ctx.fillStyle = '#22c55e';
  ctx.font = 'bold 26px Arial';
  ctx.fillText('BIG WITHDRAWAL', 70, 105);

  ctx.shadowColor = '#facc15';
  ctx.shadowBlur = 24;
  ctx.fillStyle = '#facc15';
  ctx.font = 'bold 66px Arial';
  ctx.fillText(`AUD ${Math.abs(Number(data.amount || 0)).toFixed(2)}`, 70, 190);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#e5e7eb';
  ctx.font = '24px Arial';
  ctx.fillText(`Mobile: ${maskPhone(data.mobile)}`, 70, 270);
  ctx.fillText(`Provider: ${data.provider || 'UNKNOWN'}`, 70, 320);
  ctx.fillText(`Time: ${formatTime(data.time)}`, 70, 370);
  ctx.fillText(`Transaction ID: ${data.id || 'UNKNOWN'}`, 70, 420);

  ctx.fillStyle = '#a78bfa';
  ctx.font = '20px Arial';
  ctx.fillText('FAST PAYMENT • TRUSTED • SAFE', 70, 470);

  try {
    const ufo = await loadImage(UFO_LOGO);
    ctx.drawImage(ufo, 55, 48, 120, 48);
  } catch (e) {}

  try {
    const providerLogoUrl = PROVIDER_LOGOS[String(data.provider || '').toUpperCase()];
    if (providerLogoUrl) {
      const pLogo = await loadImage(providerLogoUrl);
      ctx.drawImage(pLogo, 760, 55, 90, 90);
    }
  } catch (e) {}

  fs.writeFileSync('withdraw.png', canvas.toBuffer('image/png'));
}

module.exports = generateImage;
