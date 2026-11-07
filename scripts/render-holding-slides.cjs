// Renders the holding slides (Admin → Holding Slides) as 1920×1080 PNGs, every revision, from the
// designs below. Needs the site running on port 3930 (npm run build, then PORT=3930 npx next start)
// and Playwright. Usage: node scripts/render-holding-slides.cjs holding-slides
// Then make each preview: convert <file>.png -resize 960x -quality 82 <file>.jpg
// For a new revision: add a job here, its files to holding-slides/, and an entry in lib/holding-slides.ts.
const { chromium } = require('playwright'); const OUT = process.argv[2];
const BLUE = 'background:radial-gradient(ellipse at 50% 40%, #4f6d97 0%, #456188 45%, #34496a 100%)';
const PHOTO = 'background:linear-gradient(rgba(52,73,106,0.82),rgba(52,73,106,0.9)),url(/images/hero-aerial.jpg) center/cover';
const CIRCLES = '<div style="position:absolute;right:-180px;top:-260px;width:760px;height:760px;border-radius:50%;background:rgba(255,255,255,0.05)"></div><div style="position:absolute;left:-220px;bottom:-320px;width:820px;height:820px;border-radius:50%;background:rgba(255,255,255,0.04)"></div>';
// The original designs, exactly as first made.
const early = ({ bg, circles, thanks, tagline }) => `<div style="position:fixed;inset:0;width:1920px;height:1080px;overflow:hidden;${bg};display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#fff">
${circles ? CIRCLES : ''}
<img src="/images/logo-white.png" style="width:520px;height:auto;position:relative">
<div style="width:120px;height:4px;border-radius:2px;background:rgba(255,255,255,0.55);margin:64px 0 60px;position:relative"></div>
<h1 style="font-family:var(--font-head);font-weight:600;font-size:104px;line-height:1.12;margin:0;color:#fff;letter-spacing:-0.01em;position:relative">The service will be<br>broadcast shortly</h1>
${thanks ? '<p style="font-family:var(--font-body);font-size:40px;margin:44px 0 0;color:#dbe4f0;position:relative">Thank you for joining us online</p>' : ''}
${tagline ? '<p style="position:absolute;bottom:56px;left:0;right:0;font-family:var(--font-head);font-size:28px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.7);margin:0">knowing Jesus &nbsp;·&nbsp; making Jesus known</p>' : ''}
</div>`;
const photo = ({ title, sub, raised, balance }) => `<div style="position:fixed;inset:0;width:1920px;height:1080px;${raised ? 'box-sizing:border-box;padding-bottom:200px;' : ''}overflow:hidden;${PHOTO};display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#fff">
<img src="/images/logo-white.png" style="width:520px;height:auto">
<div style="width:120px;height:4px;border-radius:2px;background:rgba(255,255,255,0.55);margin:64px 0 60px"></div>
<h1 style="font-family:var(--font-head);font-weight:600;font-size:104px;line-height:1.12;margin:0;color:#fff;letter-spacing:-0.01em${balance ? ';max-width:1500px;text-wrap:balance' : ''}">${title}</h1>
${sub ? '<p style="font-family:var(--font-body);font-size:52px;margin:48px 0 0;color:#dbe4f0">' + sub + '</p>' : ''}
</div>`;
const B = 'The service will be<br>broadcast shortly';
const M = ['Thank you for joining our service this morning', 'Join us again this evening at 17:30'];
const E = ['Thank you for joining our service this evening', 'Join us again next week at 10:30 and 17:30'];
const jobs = [
  ['broadcast-shortly/v1-blue', early({ bg: BLUE, circles: true, thanks: true, tagline: true })],
  ['broadcast-shortly/v1-photo', early({ bg: PHOTO, circles: true, thanks: true, tagline: true })],
  ['broadcast-shortly/v2-blue', early({ bg: BLUE, circles: true, thanks: true })],
  ['broadcast-shortly/v2-photo', early({ bg: PHOTO, circles: false, thanks: true })],
  ['broadcast-shortly/v3', photo({ title: B })],
  ['broadcast-shortly/v4', photo({ title: B, raised: true, balance: true })],
  ['service-starting-shortly/v1', photo({ title: 'The service will start shortly', balance: true })],
  ['service-starting-shortly/v2', photo({ title: 'The service will start shortly', raised: true, balance: true })],
  ['thank-you-morning/v1', photo({ title: M[0], sub: M[1], balance: true })],
  ['thank-you-morning/v2', photo({ title: M[0], sub: M[1], raised: true, balance: true })],
  ['thank-you-evening/v1', photo({ title: E[0], sub: E[1], balance: true })],
  ['thank-you-evening/v2', photo({ title: E[0], sub: E[1], raised: true, balance: true })],
];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await p.goto('http://localhost:3930/'); await p.evaluate(() => document.fonts.ready);
  for (const [name, html] of jobs) {
    await p.evaluate((html) => { document.body.innerHTML = html; }, html); await p.waitForTimeout(700);
    await p.screenshot({ path: `${OUT}/${name}.png`, clip: { x: 0, y: 0, width: 1920, height: 1080 } });
  }
  await b.close();
})();
