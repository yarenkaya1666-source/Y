const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const times = process.argv.slice(3).map(Number), out = process.argv[2];
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type()==='error' && errs.push(m.text()));
  await p.goto('file://' + path.join(__dirname, 'index.html'));
  await p.evaluate(() => document.fonts.ready);
  for (const t of times) {
    await p.evaluate(t => renderAt(t), t);
    await p.screenshot({ path: `${out}/still_${String(t).padStart(5,'0')}.png` });
  }
  if (errs.length) console.log('ERRORS', errs);
  await b.close();
})();
