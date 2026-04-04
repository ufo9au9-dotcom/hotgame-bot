const { chromium } = require('playwright');
const fs = require('fs');

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

// 🔥 UFO 页面
const URL = 'https://ufo9.asia/hotgame';

(async () => {
  try {
    const browser = await chromium.launch({ headless: true });

    const context = await browser.newContext({
      viewport: { width: 1600, height: 1200 },
      timezoneId: 'Australia/Sydney'
    });

    const page = await context.newPage();

    await page.goto(URL, { waitUntil: 'domcontentloaded' });

    await page.waitForSelector('#steam-hot-wrap');
    await page.waitForTimeout(8000);

    // ✅ 抓游戏
    const pageData = await page.evaluate(() => {
      const provider =
        document.querySelector('#steamHotProviderLogo')?.alt?.replace(' logo','') ||
        'HOT GAME';

      const games = Array.from(document.querySelectorAll('.steam-hot-name'))
        .map(el => el.textContent.trim())
        .slice(0, 4);

      return { provider, games };
    });

    const card = await page.$('#steam-hot-wrap');
    await card.screenshot({ path: 'hotgame.png' });

    await browser.close();

    const gamesText = pageData.games.map(g => `📈 ${g}`).join('\n');

    // 🔥 UFO 风格 caption（像你图）
    const caption =
`‼️ HOT GAMES TIPS ‼️
📢 ${pageData.provider}

${gamesText}

• Fast Payment System •
🐸 Australia Trusted UFO9 🐸
💰 Deposit 5sec-15sec ✅
💰 Withdraw 2min-5min ✅
━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 Register ID ➤ <a href="https://ufo9.asia/RFUFO9TLG">CLICK ME</a>`;

    const form = new FormData();
    form.append('chat_id', CHAT_ID);
    form.append('caption', caption);
    form.append('parse_mode', 'HTML'); // ⭐ 必须
    form.append('photo', new Blob([fs.readFileSync('hotgame.png')]), 'hotgame.png');

    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      body: form
    });

    const json = await res.json();

    if (!json.ok) throw new Error(JSON.stringify(json));

    console.log('✅ UFO SENT SUCCESS');

  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
