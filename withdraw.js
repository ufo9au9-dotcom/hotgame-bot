const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');

const UFO_LOGO = "https://static.gwvkyk.com/media/82d608b3d0d966ec2d7b6.png";
const PROVIDER_LOGOS = {
  JILI: "https://static.gwvkyk.com/media/808802e3a0d960ec3ed7d.png"
};

function maskPhone(phone) {
  return phone.replace(/(\d{2})\d+(\d{3})/, '$1******$2');
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString("en-AU", {
    timeZone: "Australia/Sydney",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

async function generateImage(data) {
  const canvas = createCanvas(900, 520);
  const ctx = canvas.getContext('2d');

  // 🌌 背景渐变（UFO风格）
  const bg = ctx.createLinearGradient(0, 0, 900, 520);
  bg.addColorStop(0, "#0f172a");
  bg.addColorStop(1, "#1e1b4b");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 900, 520);

  // 🌟 光晕
  const glow = ctx.createRadialGradient(450, 260, 50, 450, 260, 400);
  glow.addColorStop(0, "rgba(99,102,241,0.25)");
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 900, 520);

  // 🧊 玻璃卡片
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.fillRect(40, 40, 820, 440);

  // 🔥 标题
  ctx.fillStyle = "#22c55e";
  ctx.font = "bold 28px Arial";
  ctx.fillText("💥 BIG WINNING", 70, 100);

  // 💰 金额（发光）
  ctx.shadowColor = "#facc15";
  ctx.shadowBlur = 20;
  ctx.fillStyle = "#facc15";
  ctx.font = "bold 64px Arial";
  ctx.fillText(`AUD ${Math.abs(data.amount).toFixed(2)}`, 70, 180);
  ctx.shadowBlur = 0;

  // 📋 信息
  ctx.fillStyle = "#e5e7eb";
  ctx.font = "24px Arial";

  ctx.fillText(`📱 ${maskPhone(data.mobile)}`, 70, 260);
  ctx.fillText(`🎰 ${data.provider}`, 70, 310);
  ctx.fillText(`🕒 ${formatTime(data.time)}`, 70, 360);

  // 🏷 底部
  ctx.fillStyle = "#a78bfa";
  ctx.font = "20px Arial";
  ctx.fillText("FAST PAYMENT • TRUSTED • SAFE", 70, 430);

  // 🖼 加载 UFO Logo
  try {
    const ufo = await loadImage(UFO_LOGO);
    ctx.drawImage(ufo, 50, 50, 120, 50);
  } catch (e) {}

  // 🖼 Provider Logo
  try {
    const pLogo = PROVIDER_LOGOS[data.provider];
    if (pLogo) {
      const img = await loadImage(pLogo);
      ctx.drawImage(img, 750, 50, 100, 100);
    }
  } catch (e) {}

  fs.writeFileSync("withdraw.png", canvas.toBuffer("image/png"));
}

module.exports = generateImage;
