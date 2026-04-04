const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');

const TEMPLATE = 'template.png'; // 👈 用你刚刚那张链接下载后命名

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
  return phone.replace(/(\d{2})\d+(\d{3})/, '$1******$2');
}

async function generateImage(data) {
  const base = await loadImage(TEMPLATE);

  const canvas = createCanvas(base.width, base.height);
  const ctx = canvas.getContext('2d');

  // 背景
  ctx.drawImage(base, 0, 0, base.width, base.height);

  const centerX = base.width / 2;

  // ===== 金额 =====
  ctx.shadowColor = '#FFD700';
  ctx.shadowBlur = 25;
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 72px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(
    `AUD ${Math.abs(data.amount).toFixed(2)}`,
    centerX,
    110
  );
  ctx.shadowBlur = 0;

  // ===== 手机 + provider =====
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px Arial';
  ctx.fillText(
    `${maskPhone(data.mobile)}   •   ${data.provider}`,
    centerX,
    160
  );

  // ===== 时间 =====
  ctx.font = '28px Arial';
  ctx.fillText(
    formatTime(data.time),
    centerX,
    200
  );

  // 输出
  fs.writeFileSync('withdraw.png', canvas.toBuffer('image/png'));
}

module.exports = generateImage;
