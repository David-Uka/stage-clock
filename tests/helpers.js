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
// The remote-displays panel is collapsed by default and shows one transport at a time.
async function openTransport(page, name) {
  await page.evaluate(() => { document.getElementById('remotePanel').open = true; });
  await page.click(`[data-seg="transport"] [data-transport="${name}"]`);
  // The relay address lives under the section's "How this works" disclosure.
  if (name === 'relay') await page.evaluate(() => { document.querySelector('section[data-transport="relay"] details.help').open = true; });
}
module.exports = { KEY, timer, stateWith, openWithState, readState, openTransport };
