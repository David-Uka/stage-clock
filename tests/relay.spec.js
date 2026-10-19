const { test, expect } = require('@playwright/test');
const { WebSocketServer } = require('ws');
const { timer, stateWith, openWithState } = require('./helpers');

// A tiny stand-in for the Cloudflare relay (relay/src/index.js), speaking the same protocol.
let wss, relayUrl;
const rooms = new Map();
test.beforeAll(async () => {
  wss = new WebSocketServer({ port: 0 });
  await new Promise(r => wss.once('listening', r));
  relayUrl = `http://127.0.0.1:${wss.address().port}`;
  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://x'); const code = url.pathname.split('/').pop(); const role = url.searchParams.get('role');
    const room = rooms.get(code) || rooms.set(code, { last: null, sockets: new Set() }).get(code);
    ws.role = role; room.sockets.add(ws);
    const counts = () => { const n = [...room.sockets].filter(s => s.role === 'display').length; room.sockets.forEach(s => { if (s.role === 'controller') s.send(JSON.stringify({ type: 'clients', n })); }); };
    if (role === 'display' && room.last) ws.send(room.last);
    counts();
    ws.on('message', d => { if (ws.role !== 'controller') return; room.last = String(d); room.sockets.forEach(s => { if (s.role === 'display') s.send(room.last); }); });
    ws.on('close', () => { room.sockets.delete(ws); counts(); });
  });
});
test.afterAll(() => wss.close());

test('controller hosts a relay room and a display joins through the link', async ({ page, context }) => {
  await openWithState(page, stateWith([timer({ title: 'Relayed' })]));
  await page.fill('#relayUrl', relayUrl);
  await page.click('#relayStart');
  await expect(page.locator('#relayOn')).toBeVisible();
  const code = await page.locator('#relayCode').textContent();
  expect(code).toMatch(/^[A-Z2-9]{6}$/);
  const link = await page.locator('#relayLink').inputValue();
  expect(link).toContain('relay=' + encodeURIComponent(relayUrl));
  expect(link).toContain('&room=' + code);
  await expect(page.locator('#relayQr svg')).toHaveCount(1);
  await expect(page.locator('#relayClients')).toHaveText('No displays connected');

  const display = await context.newPage();
  await display.goto(link.replace(/^.*\?/, '/index.html?'));
  await expect(display.locator('.o-title')).toHaveText('Relayed');
  await expect(page.locator('#relayClients')).toHaveText('1 display connected');
  await page.click('#btnPlay');
  await expect.poll(() => display.evaluate(() => window.__stageClock.remote.connected)).toBe(true);
  await expect(display.locator('.o-time')).toHaveText(/^00:5\d$/);
  await display.close();
  await expect(page.locator('#relayClients')).toHaveText('No displays connected');
  await page.click('#relayStop');
  await expect(page.locator('#relayOn')).toBeHidden();
});

test('relay address is remembered and validated', async ({ page }) => {
  await openWithState(page, stateWith([timer()]));
  await page.click('#relayStart');
  await expect(page.locator('#relayError')).toHaveText('Enter the relay address first.');
  await page.fill('#relayUrl', 'not a url'); await page.click('#relayStart');
  await expect(page.locator('#relayError')).toContainText('not a valid URL');
  await page.fill('#relayUrl', 'https://relay.example.com/'); await page.locator('#relayUrl').blur();
  await page.reload();
  await expect(page.locator('#relayUrl')).toHaveValue('https://relay.example.com/');
});

test('display explains an incomplete relay link', async ({ page }) => {
  await page.goto('/index.html?view=output&relay=https://relay.example.com&room=');
  await expect(page.locator('.o-conn')).toContainText('incomplete');
});
