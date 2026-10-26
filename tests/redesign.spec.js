const { test, expect } = require('@playwright/test');
const { timer, stateWith, openWithState, readState } = require('./helpers');

test('the state of the show is loud: status bar, preview frame, active card and Start button agree', async ({ page }) => {
  await openWithState(page, stateWith([timer({ title: 'Keynote', duration: 600 }), timer()]));
  const states = () => page.evaluate(() => [document.getElementById('statusLine').dataset.state, document.getElementById('previewWrap').dataset.state, document.querySelector('#rundown .timer-card.active').dataset.state]);
  await expect.poll(states).toEqual(['ready', 'ready', 'ready']);
  await expect(page.locator('#btnPlay')).toHaveText('Start');
  await page.click('#btnPlay');
  await expect.poll(states).toEqual(['running', 'running', 'running']);
  await expect(page.locator('#btnPlay')).toHaveText('Pause');
  await expect(page.locator('#btnPlay')).toHaveAttribute('data-state', 'running');
  await expect(page.locator('#rundown .timer-card.active .live')).toHaveText(/^(10:00|09:5\d)$/);
  await page.click('#btnPlay');
  await expect.poll(states).toEqual(['paused', 'paused', 'paused']);
  await expect(page.locator('#btnPlay')).toHaveText('Resume');
  await expect(page.locator('#preview')).toHaveClass(/paused/);
  await expect(page.locator('#preview .o-paused')).toBeVisible();
});

test('over time turns everything red and makes Next the blue button', async ({ page }) => {
  await openWithState(page, stateWith([timer({ duration: 1, warnAt: 0, critAt: 0 }), timer()]));
  await page.click('#btnPlay');
  await expect(page.locator('#statusLine')).toHaveAttribute('data-state', 'over', { timeout: 4000 });
  await expect(page.locator('#btnNext')).toHaveClass(/primary/);
  await expect(page.locator('#btnPlay')).toHaveAttribute('data-state', 'over');
  await page.click('#btnNext');
  const s = await readState(page);
  expect(s.timers[0].done).toBe(true);
  expect(s.timers[0].actualMs).toBeGreaterThan(1000);
  await expect(page.locator('#rundown .timer-card').first()).toContainText('actual');
});

test('shortcuts live behind the help button and the ? key, not on the main page', async ({ page }) => {
  await openWithState(page, stateWith([timer()]));
  await expect(page.locator('#controller .shortcuts')).toHaveCount(0);
  await expect(page.locator('#controller kbd')).toHaveCount(0);
  await page.keyboard.press('Shift+?');
  await expect(page.locator('#helpDialog')).toBeVisible();
  await expect(page.locator('#helpDialog .shortcuts')).toContainText('Start / pause');
  await page.click('#helpClose');
  await expect(page.locator('#helpDialog')).toBeHidden();
  await page.click('#btnHelp');
  await expect(page.locator('#helpDialog')).toBeVisible();
});

test('timer dialog: presets fill the thresholds and impossible values block Save', async ({ page }) => {
  await openWithState(page, stateWith([timer()]));
  await page.click('#btnAdd');
  await expect(page.locator('#tMore')).not.toHaveAttribute('open', '');
  await expect(page.locator('#tStartAt')).toBeHidden();
  await expect(page.locator('#tDelete')).toBeHidden();
  await page.fill('#tTitle', 'Panel');
  await page.click('[data-seg="tWarn"] [data-value="120"]');
  await page.click('[data-seg="tCrit"] [data-value="30"]');
  await expect(page.locator('#tSave')).toBeEnabled();
  await page.click('[data-seg="tCrit"] [data-value="custom"]');
  await page.fill('#tCritM', '5');
  await expect(page.locator('#tValidation')).toContainText('Red must come before yellow');
  await expect(page.locator('#tSave')).toBeDisabled();
  await page.fill('#tCritM', '0'); await page.fill('#tCritS', '45');
  await expect(page.locator('#tValidation')).toBeHidden();
  await page.click('#tSave');
  const s = await readState(page);
  expect(s.timers[1]).toMatchObject({ title: 'Panel', warnAt: 120, critAt: 45 });
});

test('message presets fill the box and the panel says when a message is on screen', async ({ page }) => {
  await openWithState(page, stateWith([timer()]));
  await page.click('#msgPresets [data-preset="Please wrap up"]');
  await expect(page.locator('#msgText')).toHaveValue('Please wrap up');
  await page.click('#btnMsgShow');
  await expect(page.locator('#msgState')).toHaveText('On screen');
  await expect(page.locator('#preview .o-message')).toHaveText('Please wrap up');
  await page.click('#btnMsgHide');
  await expect(page.locator('#msgState')).not.toHaveText('On screen');
});

test('delete asks twice and reset all moved away from add', async ({ page }) => {
  await openWithState(page, stateWith([timer({ title: 'A' }), timer({ title: 'B' })]));
  const card = page.locator('#rundown .timer-card').nth(1);
  await card.locator('[data-act="menu"]').click();
  await card.locator('[data-act="del"]').click();
  expect((await readState(page)).timers).toHaveLength(2);
  await expect(card.locator('[data-act="del"]')).toContainText('Click again');
  await card.locator('[data-act="del"]').click();
  expect((await readState(page)).timers).toHaveLength(1);
  await expect(page.locator('.section-head #btnResetAll')).toHaveCount(0);
  await expect(page.locator('#total #btnResetAll')).toBeVisible();
});

test('phone-sized controller puts Now playing first and folds the top bar into a menu', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await openWithState(page, stateWith([timer(), timer(), timer()]));
  const play = await page.locator('#btnPlay').boundingBox();
  const firstCard = await page.locator('#rundown .timer-card').first().boundingBox();
  expect(play.y).toBeLessThan(firstCard.y);
  expect(play.height).toBeGreaterThanOrEqual(56);
  await expect(page.locator('#btnSettings')).toBeHidden();
  await page.click('#btnMore');
  await expect(page.locator('#btnSettings')).toBeVisible();
  // touch reordering without drag and drop
  const before = (await readState(page)).timers.map(t => t.id);
  const card = page.locator('#rundown .timer-card').nth(2);
  await card.locator('[data-act="menu"]').click();
  await card.locator('[data-act="up"]').click();
  const after = (await readState(page)).timers.map(t => t.id);
  expect(after).toEqual([before[0], before[2], before[1]]);
});

test('phone remote: status on top, controls locked until the PIN is accepted', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 664 });
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
  await page.addInitScript(fakePeer);
  await page.goto('/index.html?view=remote&room=ABC234');
  await expect.poll(() => page.evaluate(() => window.__conns.length)).toBe(1);
  const conn = await page.locator('#rConn').boundingBox(), pin = await page.locator('#rPin').boundingBox(), grid = await page.locator('#rGrid').boundingBox();
  expect(conn.y).toBeLessThan(pin.y); expect(pin.y).toBeLessThan(grid.y);
  expect(pin.y + pin.height).toBeLessThan(664);
  await expect(page.locator('#rGrid')).toHaveAttribute('data-locked', '');
  await page.fill('#rPin', '4821');
  const hello = await page.evaluate(() => window.__conns[0].sent.at(-1));
  expect(hello).toMatchObject({ type: 'command', action: 'hello', pin: '4821' });
  await page.evaluate(id => window.__conns[0].emit('data', { type: 'ack', id, ok: true }), hello.id);
  await expect(page.locator('#rPinMsg')).toHaveText('PIN accepted');
  await expect(page.locator('#rGrid')).not.toHaveAttribute('data-locked', '');
  const play = await page.locator('#rPlay').boundingBox();
  expect(play.height).toBeGreaterThanOrEqual(72);
});

test('nudging before Start keeps the show ready, and an armed Delete disarms when the menu closes', async ({ page }) => {
  await openWithState(page, stateWith([timer({ title: 'A', duration: 600 }), timer({ title: 'B' })]));
  await page.click('[data-nudge="-60"]');
  await expect(page.locator('#statusLine')).toHaveAttribute('data-state', 'ready');
  await expect(page.locator('#btnPlay')).toHaveText('Start');
  await page.click('#btnPlay'); await page.click('#btnPlay'); await page.click('[data-nudge="300"]');
  await expect(page.locator('#statusLine')).toHaveAttribute('data-state', 'paused');
  const card = page.locator('#rundown .timer-card').nth(1);
  await card.locator('[data-act="menu"]').click();
  await card.locator('[data-act="del"]').click();
  await page.click('h2');
  await card.locator('[data-act="menu"]').click();
  await expect(card.locator('[data-act="del"]')).toHaveText('Delete');
  await card.locator('[data-act="del"]').click();
  expect((await readState(page)).timers).toHaveLength(2);
});

test('editing a timer that uses an advanced option opens More options with a summary', async ({ page }) => {
  await openWithState(page, stateWith([timer({ title: 'Break', atZero: 'stop', trigger: 'scheduled', startAt: '15:30' })]));
  await page.locator('#rundown .timer-card').first().locator('[data-act="edit"]').click();
  await expect(page.locator('#tMore')).toHaveAttribute('open', '');
  await expect(page.locator('#tMoreHint')).toHaveText('stops at zero · at 15:30');
  await expect(page.locator('#tStartAt')).toHaveValue('15:30');
});
