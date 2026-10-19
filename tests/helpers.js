const KEY = 'stage-clock-state-v1';
function timer(over) {
  return { id: Math.random().toString(36).slice(2, 8), title: 'T', speaker: '', duration: 60, warnAt: 20, critAt: 10,
    mode: 'down', atZero: 'continue', trigger: 'manual', startAt: '', done: false, ...over };
}
function stateWith(timers, over = {}) {
  return { v: 1, timers, activeId: timers[0].id, running: false, endAt: 0, remainingMs: timers[0].duration * 1000,
    message: { text: '', color: 'white', bold: false, upper: false, flash: false, on: false },
    blackout: false, flashNonce: 0, settings: {}, ...over };
}
async function openWithState(page, state, { noRaf = false } = {}) {
  if (noRaf) await page.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await page.addInitScript(([k, s]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(k, JSON.stringify(s)); sessionStorage.setItem('seeded', '1'); } }, [KEY, state]);
  await page.goto('/index.html');
}
const readState = page => page.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
module.exports = { KEY, timer, stateWith, openWithState, readState };
