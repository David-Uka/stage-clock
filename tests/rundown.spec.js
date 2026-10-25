const { test, expect } = require('@playwright/test');
const { KEY, timer, stateWith, openWithState, readState } = require('./helpers');

test('adds a timer through the dialog', async ({ page }) => {
  await openWithState(page, stateWith([timer()]));
  await page.click('#btnAdd');
  await page.fill('#tTitle', 'Closing remarks');
  await page.fill('#tSpeaker', 'Host');
  await page.fill('#tM', '7'); await page.fill('#tS', '30');
  await page.click('[data-seg="tTrigger"] [data-value="scheduled"]');
  await page.fill('#tStartAt', '16:45');
  await page.click('#tSave');
  const s = await readState(page);
  expect(s.timers).toHaveLength(2);
  expect(s.timers[1]).toMatchObject({ title: 'Closing remarks', speaker: 'Host', duration: 450, trigger: 'scheduled', startAt: '16:45' });
  await expect(page.locator('#rundown .timer-card').nth(1)).toContainText('starts 16:45');
});

test('imports a 1.0 export and converts auto-next into a linked start', async ({ page }) => {
  await openWithState(page, stateWith([timer()]));
  const old = { app: 'stage-clock', v: 1, timers: [
    { title: 'A', duration: 120, warnAt: 30, critAt: 10, mode: 'down', atZero: 'continue', autoNext: true },
    { title: 'B', duration: 300, warnAt: 60, critAt: 30, mode: 'up', atZero: 'stop', autoNext: false },
  ] };
  await page.click('#btnImport');
  await page.fill('#ioText', JSON.stringify(old));
  await page.click('#ioLoad');
  const s = await readState(page);
  expect(s.timers.map(t => [t.title, t.trigger, t.mode])).toEqual([['A', 'manual', 'down'], ['B', 'linked', 'up']]);
});

test('migrates a saved 1.0 state on load', async ({ page }) => {
  const a = { ...timer({ title: 'A' }), autoNext: true }, b = timer({ title: 'B' });
  delete a.trigger; delete a.startAt; delete b.trigger; delete b.startAt;
  await openWithState(page, stateWith([a, b]));
  const s = await readState(page);
  expect(s.timers[1].trigger).toBe('linked');
  expect(s.timers[0].autoNext).toBeUndefined();
});

test('rejects a bad import without touching the rundown', async ({ page }) => {
  await openWithState(page, stateWith([timer({ title: 'Keep me' })]));
  await page.click('#btnImport');
  await page.fill('#ioText', '{"nope": true}');
  await page.click('#ioLoad');
  await expect(page.locator('#ioHint')).toContainText('not a valid');
  expect((await readState(page)).timers[0].title).toBe('Keep me');
});

test('output window follows the controller through storage', async ({ context, page }) => {
  await openWithState(page, stateWith([timer({ title: 'Keynote', speaker: 'Amara' })]));
  const out = await context.newPage();
  await out.goto('/index.html?view=output');
  await expect(out.locator('.o-title')).toHaveText('Keynote');
  await page.click('#btnBlackout');
  await expect(out.locator('#bigOutput')).toHaveClass(/blackout/);
});
