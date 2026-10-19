const { test, expect } = require('@playwright/test');
const { timer, stateWith, openWithState } = require('./helpers');

// A fake PeerJS: records connections and lets the test drive both ends without the public signalling service.
const fakePeer = () => {
  class Emitter { constructor() { this.h = {}; } on(e, f) { (this.h[e] ||= []).push(f); return this; } emit(e, ...a) { (this.h[e] || []).forEach(f => f(...a)); } }
  class Conn extends Emitter { constructor(peerId) { super(); this.peer = peerId; this.open = false; this.sent = []; } send(m) { this.sent.push(m); } }
  class Peer extends Emitter {
    constructor(id) { super(); this.id = id || 'anon'; this.destroyed = false; window.__peers.push(this); setTimeout(() => this.emit('open', this.id), 0); }
    connect(id) { const c = new Conn(id); window.__conns.push(c); setTimeout(() => { c.open = true; c.emit('open'); }, 0); return c; }
    destroy() { this.destroyed = true; } reconnect() {}
  }
  window.__peers = []; window.__conns = []; window.Peer = Peer; window.__Conn = Conn;
};

test('controller starts a room, shows code, link and QR, and streams state to a joined display', async ({ page }) => {
  await page.addInitScript(fakePeer);
  await openWithState(page, stateWith([timer({ title: 'Keynote' })]));
  await page.click('#roomStart');
  await expect(page.locator('#roomOn')).toBeVisible();
  const code = await page.locator('#roomCode').textContent();
  expect(code).toMatch(/^[A-Z2-9]{6}$/);
  await expect(page.locator('#roomUrl')).toHaveValue(new RegExp(`\\?view=output&room=${code}$`));
  await expect(page.locator('#roomQr svg')).toHaveCount(1);
  expect(await page.evaluate(() => window.__peers[0].id)).toBe('stageclock-' + code);
  // A display connects
  await page.evaluate(() => { const c = new window.__Conn('display'); window.__dc = c; window.__peers[0].emit('connection', c); c.open = true; c.emit('open'); });
  await expect(page.locator('#roomClients')).toHaveText('1 display connected');
  const first = await page.evaluate(() => window.__dc.sent[0]);
  expect(first.state.timers[0].title).toBe('Keynote');
  await page.click('#btnPlay');
  await expect.poll(() => page.evaluate(() => window.__dc.sent.at(-1).state.running)).toBe(true);
  await page.click('#roomStop');
  await expect(page.locator('#roomOff')).toBeVisible();
  expect(await page.evaluate(() => window.__peers[0].destroyed)).toBe(true);
});

test('display joins a room from the link and shows the controller state', async ({ page }) => {
  await page.addInitScript(fakePeer);
  await page.goto('/index.html?view=output&room=abc234');
  await expect(page.locator('.o-conn')).toContainText('room ABC234');
  await expect.poll(() => page.evaluate(() => window.__conns.length)).toBe(1);
  expect(await page.evaluate(() => window.__conns[0].peer)).toBe('stageclock-ABC234');
  const s = stateWith([timer({ title: 'From afar' })]);
  await page.evaluate(st => window.__conns[0].emit('data', { type: 'state', state: st, sentAt: Date.now() }), s);
  await expect(page.locator('.o-title')).toHaveText('From afar');
  await expect(page.locator('#bigOutput')).not.toHaveClass(/no-source/);
});

test('display asks for a code when the link has none', async ({ page }) => {
  await page.addInitScript(fakePeer);
  await page.goto('/index.html?view=output&room=');
  await expect(page.locator('#roomInput')).toBeVisible();
  await page.fill('#roomInput', 'xyz123');
  await page.click('.o-conn button');
  await expect(page).toHaveURL(/room=XYZ123/);
});
