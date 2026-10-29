const { chromium } = require('playwright');
const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:4000';
const OUT = process.env.SHOTS_DIR ?? 'test';
require('fs').mkdirSync(OUT, { recursive: true });
const ID = process.env.OPPORTUNITY_ID; // an opportunity with no stage facts recorded
let n = 0;
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 }, recordVideo: { dir: OUT + '/video', size: { width: 1600, height: 1000 } } });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('PAGEERROR', e.message.slice(0, 200)));
  p.on('response', async r => { if (r.url().includes('/api/bus/opportunity/') && ['PATCH','PUT'].includes(r.request().method())) console.log('  save →', r.status(), r.status() >= 300 ? (await r.text()).slice(0, 300) : ''); });
  const shot = async (what) => { await p.waitForTimeout(800); const f = `${OUT}/${String(++n).padStart(2, '0')}-${what}.png`; await p.screenshot({ path: f, fullPage: true }); console.log('shot', f); };
  const stage = async () => (await p.locator('[data-testid=record-state]').first().textContent().catch(() => '?'))?.trim();
  await p.goto(BASE + '/auth/login', { timeout: 180000 }); await p.waitForSelector('input[type=password]', { timeout: 180000 });
  await p.fill('input[type=email]', 'admin@admin.com'); await p.fill('input[type=password]', 'admin123');
  await p.click('button[type=submit]'); await p.waitForURL(u => !u.pathname.startsWith('/auth/login'), { timeout: 120000 });
  const open = async () => { await p.goto(`${BASE}/opportunity/${ID}`); await p.locator('[data-testid=record-state]').first().waitFor({ timeout: 120000 }); await p.waitForTimeout(3000); };
  const save = async (fill, label) => {
    await p.getByRole('button', { name: 'Edit' }).first().click(); await p.waitForTimeout(1500);
    for (const [column, value] of Object.entries(fill)) await p.locator('#' + column).fill(value);
    await p.getByRole('button', { name: /Save Changes/ }).first().click(); await p.waitForTimeout(7000);
    await open(); console.log(label, '→ stage:', await stage()); await shot(label);
  };
  await open(); console.log('start → stage:', await stage()); await shot('probe-at-prospecting');
  await save({ qualification_at: '2026-10-18T10:00' }, 'recorded-qualification');
  await save({ needs_analysis_at: '2026-10-20T10:00' }, 'recorded-needs-analysis');
  await save({ proposal_at: '2026-10-22T10:00' }, 'recorded-proposal');
  await save({ negotiation_at: '2026-10-25T10:00' }, 'recorded-negotiation');
  await save({ closed_won_at: '2026-10-28T19:30' }, 'recorded-closed-won');
  await save({ description: 'Signed after a three-week negotiation.' }, 'edited-the-won-deal');
  await ctx.close(); await b.close();
})();
