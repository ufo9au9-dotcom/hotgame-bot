const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');

const TEMPLATE = 'template.png';

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

function maskPhone(phone) {
  return String(phone || '').replace(/(\d{2})\d+(\d{3})/, '$1******$2');
}

async function generateImage(data) {
  const base = await loadImage(TEMPLATE);

  const canvas = createCanvas(base.width, base.height);
  const ctx = canvas.getContext('2d');

  ctx.drawImage(base, 0, 0, base.width, base.height);

  const centerX = base.width / 2;

  ctx.textAlign = 'center';

  ctx.shadowColor = '#FFD700';
  ctx.shadowBlur = 25;
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 72px Arial';
  ctx.fillText(`AUD ${Math.abs(data.amount).toFixed(2)}`, centerX, 110);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px Arial';
  ctx.fillText(
    `${maskPhone(data.mobile)}   •   ${data.provider}`,
    centerX,
    160
  );

  ctx.font = '28px Arial';
  ctx.fillText(formatTime(data.time), centerX, 200);

  fs.writeFileSync('withdraw.png', canvas.toBuffer('image/png'));
}

module.exports = generateImage;
