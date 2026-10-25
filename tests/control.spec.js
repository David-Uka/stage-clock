const { test, expect } = require('@playwright/test');
const { WebSocketServer } = require('ws');
const { timer, stateWith, openWithState, readState, openTransport } = require('./helpers');

const fakePeer = () => {
  class Emitter { constructor() { this.h = {}; } on(e, f) { (this.h[e] ||= []).push(f); return this; } emit(e, ...a) { (this.h[e] || []).forEach(f => f(...a)); } }
  class Conn extends Emitter { constructor(peerId) { super(); this.peer = peerId; this.open = false; this.sent = []; } send(m) { this.sent.push(m); } }
  class Peer extends Emitter {
    constructor(id) { super(); this.id = id || 'anon'; window.__peers.push(this); setTimeout(() => this.emit('open', this.id), 0); }
    connect(id) { const c = new Conn(id); window.__conns.push(c); setTimeout(() => { c.open = true; c.emit('open'); }, 0); return c; }
    destroy() {} reconnect() {}
  }
  window.__peers = []; window.__conns = []; window.Peer = Peer; window.__Conn = Conn;
};

test('controller applies commands with the right PIN and refuses the wrong one', async ({ page }) => {
  await openWithState(page, stateWith([timer({ title: 'A', duration: 120 }), timer({ title: 'B' })]));
  const pin = await page.locator('#pinValue').textContent();
  expect(pin).toMatch(/^\d{4}$/);
  const run = (action, value, p = pin) => page.evaluate(([a, v, pin]) => window.__stageClock.applyCommand({ type: 'command', id: 'x', action: a, value: v, pin }), [action, value, p]);
  expect(await run('play')).toEqual({ ok: true });
  expect((await readState(page)).running).toBe(true);
  expect(await run('nudge', 60)).toEqual({ ok: true });
  await expect(page.locator('#preview .o-time')).toHaveText(/^02:5\d$/);
  expect(await run('message', { text: 'Wrap up', color: 'red', bold: true })).toEqual({ ok: true });
  await expect(page.locator('#preview .o-message')).toHaveText('Wrap up');
  await expect(page.locator('#msgText')).toHaveValue('Wrap up');
  expect(await run('next')).toEqual({ ok: true });
  expect((await readState(page)).timers[1].id).toBe((await readState(page)).activeId);
  expect(await run('reset', null, '0000')).toEqual({ ok: false, reason: 'Wrong PIN' });
  expect(await run('explode')).toEqual({ ok: false, reason: 'Unknown action' });
  expect(await run('nudge', 99999)).toEqual({ ok: true });
  expect((await readState(page)).running).toBe(true);
});

test('the PIN never leaves the controller in pushed state', async ({ page }) => {
  await page.addInitScript(fakePeer);
  await openWithState(page, stateWith([timer()]));
  await openTransport(page, 'room');
  await page.click('#roomStart');
  await expect(page.locator('#roomOn')).toBeVisible();
  await page.evaluate(() => { const c = new window.__Conn('d'); window.__dc = c; window.__peers[0].emit('connection', c); c.open = true; c.emit('open'); });
  const first = await page.evaluate(() => window.__dc.sent[0]);
  expect(first.state.pin).toBeUndefined();
  expect(first.state.timers).toHaveLength(1);
});

test('room host answers phone commands over the data channel', async ({ page }) => {
  await page.addInitScript(fakePeer);
  await openWithState(page, stateWith([timer()]));
  await openTransport(page, 'room');
  await page.click('#roomStart');
  await expect(page.locator('#roomOn')).toBeVisible();
  const pin = await page.locator('#pinValue').textContent();
  await page.evaluate(() => { const c = new window.__Conn('d'); window.__dc = c; window.__peers[0].emit('connection', c); c.open = true; c.emit('open'); });
  await page.evaluate(pin => window.__dc.emit('data', { type: 'command', id: 'c1', action: 'play', pin }), pin);
  await expect.poll(() => page.evaluate(() => window.__dc.sent.find(m => m.type === 'ack'))).toEqual({ type: 'ack', id: 'c1', ok: true });
  expect((await readState(page)).running).toBe(true);
  await page.evaluate(() => window.__dc.emit('data', { type: 'command', id: 'c2', action: 'reset', pin: '1' }));
  await expect.poll(() => page.evaluate(() => window.__dc.sent.find(m => m.type === 'ack' && m.id === 'c2'))).toEqual({ type: 'ack', id: 'c2', ok: false, reason: 'Wrong PIN' });
});

test('phone remote page sends commands with the PIN and shows the result', async ({ page }) => {
  await page.addInitScript(fakePeer);
  await page.goto('/index.html?view=remote&room=ABC234');
  await expect(page.locator('#remoteView')).toBeVisible();
  await expect(page.locator('#controller')).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.__conns.length)).toBe(1);
  await page.click('#rPlay');
  await expect(page.locator('#rPinMsg')).toContainText('Enter the 4-digit PIN');
  await page.fill('#rPin', '4821');
  await page.click('#rPlay');
  const sent = await page.evaluate(() => window.__conns[0].sent.at(-1));
  expect(sent).toMatchObject({ type: 'command', action: 'play', pin: '4821' });
  await page.evaluate(id => window.__conns[0].emit('data', { type: 'ack', id, ok: false, reason: 'Wrong PIN' }), sent.id);
  await expect(page.locator('#rPinMsg')).toContainText('Wrong PIN');
  const s = stateWith([timer({ title: 'Keynote', duration: 600 })], { running: true }); s.endAt = Date.now() + 600000;
  await page.evaluate(st => window.__conns[0].emit('data', { type: 'state', state: st, sentAt: Date.now() }), s);
  await expect(page.locator('#rTitle')).toHaveText('Keynote');
  await expect(page.locator('#rTime')).toHaveText(/^(10:00|09:5\d)$/);
  await expect(page.locator('#rPlay')).toHaveText('Pause');
  await page.click('[data-cmd="nudge"][data-value="60"]');
  expect(await page.evaluate(() => window.__conns[0].sent.at(-1))).toMatchObject({ action: 'nudge', value: 60 });
  await page.fill('#rMsgText', 'Two minutes'); await page.click('[data-cmd="message"]');
  expect(await page.evaluate(() => window.__conns[0].sent.at(-1))).toMatchObject({ action: 'message', value: { text: 'Two minutes' } });
});

test('desktop bridge routes phone commands to the controller and replies to that client', async ({ page }) => {
  await page.addInitScript(() => {
    window.__replies = [];
    window.stageClock = {
      publish: () => {}, lanInfo: () => Promise.resolve({ port: 4455, urls: ['http://192.168.1.20:4455'] }),
      onClients: () => {}, onCommand: cb => { window.__cmd = cb; }, reply: (id, msg) => window.__replies.push([id, msg]),
    };
  });
  await openWithState(page, stateWith([timer()]));
  const pin = await page.locator('#pinValue').textContent();
  await page.evaluate(pin => window.__cmd({ clientId: 7, msg: { type: 'command', id: 'z', action: 'play', pin } }), pin);
  expect(await page.evaluate(() => window.__replies)).toEqual([[7, { type: 'ack', id: 'z', ok: true }]]);
  expect((await readState(page)).running).toBe(true);
  // Link switch: the same QR can point at the remote page
  await openTransport(page, 'lan');
  await page.click('.seg[data-seg="lan"] [data-kind="remote"]');
  await expect(page.locator('#lanUrl')).toHaveValue('http://192.168.1.20:4455/?view=remote&lan=1');
});

test('relay: a phone remote controls the timer end to end', async ({ page, context }) => {
  const wss = new WebSocketServer({ port: 0 }); await new Promise(r => wss.once('listening', r));
  const relayUrl = `http://127.0.0.1:${wss.address().port}`; const rooms = new Map(); let nextId = 1;
  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://x'); const code = url.pathname.split('/').pop(); ws.role = url.searchParams.get('role'); ws.cid = 'c' + nextId++;
    const room = rooms.get(code) || rooms.set(code, { last: null, sockets: new Set() }).get(code); room.sockets.add(ws);
    const each = (role, fn) => room.sockets.forEach(s => { if (s.role === role) fn(s); });
    if (ws.role !== 'controller' && room.last) ws.send(room.last);
    each('controller', c => c.send(JSON.stringify({ type: 'clients', n: [...room.sockets].filter(s => s.role !== 'controller').length })));
    ws.on('message', d => { const m = JSON.parse(String(d));
      if (ws.role === 'remote' && m.type === 'command') each('controller', c => c.send(JSON.stringify({ ...m, from: ws.cid })));
      if (ws.role === 'controller' && m.type === 'reply') room.sockets.forEach(s => { if (s.cid === m.to) s.send(JSON.stringify(m.msg)); });
      if (ws.role === 'controller' && m.type === 'state') { room.last = String(d); room.sockets.forEach(s => { if (s.role !== 'controller') s.send(room.last); }); } });
    ws.on('close', () => room.sockets.delete(ws));
  });
  await openWithState(page, stateWith([timer({ title: 'Relayed', duration: 300 })]));
  await openTransport(page, 'relay');
  await page.fill('#relayUrl', relayUrl); await page.click('#relayStart');
  await expect(page.locator('#relayOn')).toBeVisible();
  await page.click('.seg[data-seg="relay"] [data-kind="remote"]');
  const link = await page.locator('#relayLink').inputValue();
  expect(link).toContain('?view=remote&relay=');
  const pin = await page.locator('#pinValue').textContent();
  const phone = await context.newPage();
  await phone.goto(link.replace(/^.*\?/, '/index.html?'));
  await expect(phone.locator('#rTitle')).toHaveText('Relayed');
  await phone.fill('#rPin', pin); await phone.click('#rPlay');
  await expect(phone.locator('#rPinMsg')).toHaveText('PIN accepted');
  await expect.poll(async () => (await readState(page)).running).toBe(true);
  await expect(phone.locator('#rPlay')).toHaveText('Pause');
  await phone.click('[data-cmd="nudge"][data-value="60"]');
  await expect(page.locator('#preview .o-time')).toHaveText(/^05:5\d$/);
  await expect(phone.locator('#rTime')).toHaveText(/^05:5\d$/);
  await phone.close(); wss.close();
});
