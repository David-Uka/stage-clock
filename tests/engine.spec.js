const { test, expect } = require('@playwright/test');
const { timer, stateWith, openWithState, readState } = require('./helpers');

test('counts down, goes yellow, red, then into overtime', async ({ page }) => {
  const t = timer({ duration: 3, warnAt: 2, critAt: 1 });
  await openWithState(page, stateWith([t]));
  await page.click('#btnPlay');
  await expect(page.locator('#preview')).toHaveClass(/warn/, { timeout: 2500 });
  await expect(page.locator('#preview')).toHaveClass(/crit/, { timeout: 2500 });
  await expect(page.locator('#preview')).toHaveClass(/over/, { timeout: 2500 });
  await expect(page.locator('#preview .o-time')).toHaveText(/^\+00:0\d$/);
  await expect(page.locator('#preview .o-endtext')).toHaveText("TIME'S UP");
});

test('stops at zero when told to', async ({ page }) => {
  const t = timer({ duration: 2, atZero: 'stop' });
  await openWithState(page, stateWith([t]));
  await page.click('#btnPlay');
  await expect(page.locator('#preview .o-time')).toHaveText('00:00', { timeout: 4000 });
  await expect(page.locator('#statusLine')).toHaveText('Finished');
  expect((await readState(page)).running).toBe(false);
});

test('linked timer starts when the previous ends, even with animation frames paused', async ({ page }) => {
  const a = timer({ duration: 2 }), b = timer({ trigger: 'linked' });
  await openWithState(page, stateWith([a, b]), { noRaf: true });
  await page.evaluate(() => document.getElementById('btnPlay').click());
  await expect.poll(async () => (await readState(page)).activeId, { timeout: 6000 }).toBe(b.id);
  const s = await readState(page);
  expect(s.running).toBe(true);
  expect(s.timers[0].done).toBe(true);
});

test('scheduled timer starts at its time of day', async ({ page }) => {
  // Freeze the page clock just before 11:00 so the test does not wait for a real minute boundary.
  await page.clock.install({ time: new Date('2026-10-19T10:59:58') });
  const a = timer({ duration: 600 }), b = timer({ trigger: 'scheduled', startAt: '11:00' });
  await openWithState(page, stateWith([a, b]), { noRaf: true });
  await expect.poll(async () => (await readState(page)).activeId, { timeout: 8000 }).toBe(b.id);
  expect((await readState(page)).running).toBe(true);
});

test('nudging adds time while running', async ({ page }) => {
  const t = timer({ duration: 60 });
  await openWithState(page, stateWith([t]));
  await page.click('#btnPlay');
  await page.click('[data-nudge="60"]');
  await expect(page.locator('#preview .o-time')).toHaveText(/^01:5\d$/);
});
