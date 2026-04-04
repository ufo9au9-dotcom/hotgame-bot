const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');

const TEMPLATE = 'template.png';

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

  // 金额
  ctx.shadowColor = '#FFD700';
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 58px Arial';
  ctx.fillText(
    `AUD ${Math.abs(data.amount).toFixed(2)}`,
    centerX,
    135
  );
  ctx.shadowBlur = 0;

  // 手机 + provider
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px Arial';
  ctx.fillText(
    `${maskPhone(data.mobile)}   •   ${data.provider}`,
    centerX,
    190
  );

  fs.writeFileSync('withdraw.png', canvas.toBuffer('image/png'));
}

module.exports = generateImage;
