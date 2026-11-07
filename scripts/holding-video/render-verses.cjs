// Renders the background (photo, logo, title) and one transparent image per verse, 1920×1080.
const { chromium } = require('playwright'); const fs = require('fs');
const [OUT, VERSES, ONLY] = process.argv.slice(2);
const verses = JSON.parse(fs.readFileSync(VERSES, 'utf8')).slice(0, ONLY ? Number(ONLY) : undefined);
const PHOTO = 'background:linear-gradient(rgba(52,73,106,0.82),rgba(52,73,106,0.9)),url(/images/hero-aerial.jpg) center/cover';
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const verseHtml = (t) => esc(t).replace(/\{([^}]+)\}/g, '<span style="font-variant:small-caps;letter-spacing:0.02em">$1</span>');
const head = `<div style="position:absolute;left:0;right:0;top:118px;display:flex;flex-direction:column;align-items:center;text-align:center">
<img src="/images/logo-white.png" style="width:440px;height:auto">
<div style="width:110px;height:4px;border-radius:2px;background:rgba(255,255,255,0.55);margin:46px 0 42px"></div>
<h1 style="font-family:var(--font-head);font-weight:600;font-size:92px;line-height:1.1;margin:0;color:#fff;letter-spacing:-0.01em">The service will start shortly</h1>
</div>`;
const verseBlock = (v) => `<div style="position:absolute;left:0;right:0;top:500px;height:380px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">
<p style="font-family:var(--font-body);font-size:${v.text.length > 230 ? 44 : v.text.length > 150 ? 48 : 54}px;line-height:1.42;margin:0;color:#fff;max-width:1420px;text-wrap:balance;text-shadow:0 2px 12px rgba(20,30,45,0.35)">${verseHtml(v.text)}</p>
<p style="font-family:var(--font-head);font-weight:600;font-size:30px;letter-spacing:0.12em;text-transform:uppercase;margin:30px 0 0;color:#c9d6e8">${esc(v.ref)}&nbsp; <span style="font-weight:500;opacity:0.75">NIV</span></p>
</div>`;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await p.goto('http://localhost:3930/'); await p.evaluate(() => document.fonts.ready);
  const shot = async (html, file, transparent) => {
    await p.evaluate(({ html, transparent }) => {
      document.documentElement.style.background = transparent ? 'transparent' : '';
      document.body.style.background = 'transparent';
      document.body.innerHTML = `<div style="position:fixed;inset:0;width:1920px;height:1080px;overflow:hidden;color:#fff">${html}</div>`;
    }, { html, transparent });
    await p.waitForTimeout(250);
    await p.screenshot({ path: file, clip: { x: 0, y: 0, width: 1920, height: 1080 }, omitBackground: transparent });
  };
  await shot(`<div style="position:absolute;inset:0;${PHOTO}"></div>${head}`, `${OUT}/background.png`, false);
  for (const [i, v] of verses.entries()) await shot(verseBlock(v), `${OUT}/verse-${String(i + 1).padStart(2, '0')}.png`, true);
  // A combined preview of each, for checking.
  for (const [i, v] of verses.entries()) if (ONLY) await shot(`<div style="position:absolute;inset:0;${PHOTO}"></div>${head}${verseBlock(v)}`, `${OUT}/preview-${i + 1}.png`, false);
  await b.close();
})();
