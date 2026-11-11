const { test, expect } = require('@playwright/test');
const { timer, stateWith, openWithState, openTransport } = require('./helpers');

test('remote display applies pushed state and corrects for clock offset', async ({ page }) => {
  await page.goto('/index.html?view=output&lan=1');
  await expect(page.locator('#bigOutput')).toHaveClass(/no-source/);
  await expect(page.locator('.o-conn')).toContainText(/Connecting|Reconnecting|Connection lost/);
  const t = timer({ title: 'Remote keynote', duration: 600 });
  const s = stateWith([t], { running: true });
  // The controller's clock is 30 s ahead of this display's clock; the display must trust the controller.
  const controllerNow = Date.now() + 30000;
  s.endAt = controllerNow + 600000;
  await page.evaluate(msg => window.__stageClock.applyRemote(msg), { type: 'state', state: s, sentAt: controllerNow });
  await expect(page.locator('#bigOutput')).not.toHaveClass(/no-source/);
  await expect(page.locator('.o-title')).toHaveText('Remote keynote');
  await expect(page.locator('.o-time')).toHaveText(/^(10:00|09:5\d)$/);
  const offset = await page.evaluate(() => window.__stageClock.remote.clockOffset);
  expect(offset).toBeGreaterThan(29000);
});

test('remote display ignores malformed messages', async ({ page }) => {
  await page.goto('/index.html?view=output&lan=1');
  const ok = await page.evaluate(() => window.__stageClock.applyRemote({ type: 'state', state: { v: 2 } }));
  expect(ok).toBe(false);
  await expect(page.locator('#bigOutput')).toHaveClass(/no-source/);
});

test('controller in a plain browser explains that Wi-Fi displays need the desktop app', async ({ page }) => {
  await openWithState(page, stateWith([timer()]));
  await openTransport(page, 'lan');
  await expect(page.locator('#lanUnavailable')).toBeVisible();
  await expect(page.locator('#lanRemote')).toBeHidden();
});

test('controller with the desktop bridge shows the link, QR code and client count', async ({ page }) => {
  await page.addInitScript(() => {
    window.__published = [];
    window.stageClock = {
      publish: m => window.__published.push(m),
      lanInfo: () => Promise.resolve({ port: 4455, urls: ['http://192.168.1.20:4455'] }),
      onClients: cb => { window.__setClients = cb; },
    };
  });
  await openWithState(page, stateWith([timer()]));
  await openTransport(page, 'lan');
  await expect(page.locator('#lanRemote')).toBeVisible();
  await expect(page.locator('#lanUrl')).toHaveValue('http://192.168.1.20:4455/?view=output&lan=1');
  await expect(page.locator('#lanQr svg')).toHaveCount(1);
  await page.evaluate(() => window.__setClients(2));
  await expect(page.locator('#lanClients')).toHaveText('2 displays connected');
  await page.click('#btnPlay');
  const last = await page.evaluate(() => window.__published.at(-1));
  expect(last.type).toBe('state');
  expect(last.state.running).toBe(true);
  expect(typeof last.sentAt).toBe('number');
});

test('overlay link opens a transparent display that flashes its digits, not the screen', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/index.html?view=output&lan=1&overlay=1');
  await expect(page.locator('#bigOutput')).toHaveClass(/transparent/);
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  expect(await page.evaluate(() => getComputedStyle(document.getElementById('bigOutput')).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  await expect(page.locator('#btnExitOverlay')).toBeHidden();
  const t = timer({ title: 'Overlay keynote', duration: 60 });
  const s = stateWith([t], { running: true }); s.endAt = Date.now() - 5000;   // already over time
  await page.evaluate(msg => window.__stageClock.applyRemote(msg), { type: 'state', state: s, sentAt: Date.now() });
  await expect(page.locator('#bigOutput')).toHaveClass(/over/);
  expect(await page.evaluate(() => getComputedStyle(document.getElementById('bigOutput')).animationName)).toBe('none');
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('#bigOutput .o-time')).animationName)).toBe('textflash');
  s.blackout = true;
  await page.evaluate(msg => window.__stageClock.applyRemote(msg), { type: 'state', state: s, sentAt: Date.now() });
  await expect(page.locator('#bigOutput')).toHaveClass(/blackout/);
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('#bigOutput .o-mid')).visibility)).toBe('hidden');
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('#bigOutput .o-progress')).visibility)).toBe('hidden');
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('#bigOutput .o-blackout')).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  // a message is a dark panel, not a black frame; the solid end style keeps red digits; Flash blinks the digits
  s.blackout = false; s.message = { text: 'Wrap up', color: 'white', bold: false, upper: false, flash: false, on: true }; s.settings = { endStyle: 'solid' }; s.flashNonce = 7;
  await page.evaluate(msg => window.__stageClock.applyRemote(msg), { type: 'state', state: s, sentAt: Date.now() });
  await expect(page.locator('#bigOutput .o-message')).toHaveClass(/on/);
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('#bigOutput .o-message')).backgroundColor)).toBe('rgba(0, 0, 0, 0.75)');
  expect(await page.evaluate(() => getComputedStyle(document.getElementById('bigOutput')).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('#bigOutput .o-time')).color)).toBe('rgb(255, 45, 45)');
  await expect(page.locator('#bigOutput')).toHaveClass(/flashing/);
  expect(await page.evaluate(() => getComputedStyle(document.getElementById('bigOutput')).animationName)).toBe('none');
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('#bigOutput .o-time')).animationName)).toBe('identifyText');
});

test('the link kind switch offers the overlay on every transport', async ({ page }) => {
  await page.addInitScript(() => {
    window.stageClock = { publish: () => {}, lanInfo: () => Promise.resolve({ port: 4455, urls: ['http://192.168.1.20:4455'] }), onClients: () => {} };
  });
  await openWithState(page, stateWith([timer()]));
  await openTransport(page, 'lan');
  await page.click('.seg[data-seg="lan"] [data-kind="overlay"]');
  await expect(page.locator('#lanUrl')).toHaveValue('http://192.168.1.20:4455/?view=output&overlay=1&lan=1');
  await expect(page.locator('#lanKindHint')).toContainText('OBS');
});
