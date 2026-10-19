// Starts the relay locally with wrangler and checks: health, bad codes, controller → display forwarding,
// late-joiner catch-up, display count back to the controller, displays cannot push. Run with: npm test
const { spawn } = require('child_process');
const WebSocket = require('ws');
const PORT = 8799;
const base = `http://127.0.0.1:${PORT}`;
const wait = ms => new Promise(r => setTimeout(r, ms));

// Every socket keeps a queue of parsed messages so nothing is lost between awaits.
function open(url) {
  const ws = new WebSocket(url); ws.queue = [];
  ws.on('message', d => { ws.queue.push(JSON.parse(d)); });
  ws.expect = (pred, ms = 4000) => new Promise(resolve => {
    const t0 = Date.now();
    const poll = () => { const i = ws.queue.findIndex(pred); if (i >= 0) return resolve(ws.queue.splice(i, 1)[0]); if (Date.now() - t0 > ms) return resolve(null); setTimeout(poll, 25); };
    poll();
  });
  return new Promise((resolve, reject) => { ws.once('open', () => resolve(ws)); ws.once('error', reject); });
}
let dev, failed = 0;
const check = (name, ok) => { console.log((ok ? 'PASS ' : 'FAIL ') + name); if (!ok) failed++; };

async function main() {
  dev = spawn('npx', ['wrangler', 'dev', '--port', String(PORT), '--log-level', 'error'], { cwd: __dirname, stdio: ['ignore', 'ignore', 'pipe'] });
  dev.stderr.on('data', d => process.stderr.write(d));
  for (let i = 0; i < 90; i++) { try { if ((await fetch(base + '/health')).ok) break; } catch (e) {} await wait(1000); }
  check('health', (await (await fetch(base + '/health')).json()).ok === true);
  check('bad code rejected', (await fetch(base + '/room/abc')).status === 400);
  check('non-upgrade rejected', (await fetch(base + '/room/ABC234')).status === 426);

  const code = 'T' + Math.random().toString(36).slice(2, 7).toUpperCase();   // fresh room each run
  const ctrl = await open(`ws://127.0.0.1:${PORT}/room/${code.toLowerCase()}?role=controller`);
  check('controller told 0 displays', !!(await ctrl.expect(m => m.type === 'clients' && m.n === 0)));
  const d1 = await open(`ws://127.0.0.1:${PORT}/room/${code}?role=display`);
  check('controller told 1 display', !!(await ctrl.expect(m => m.type === 'clients' && m.n === 1)));
  ctrl.send(JSON.stringify({ type: 'state', state: { v: 1, activeId: 'x', timers: [] }, sentAt: Date.now() }));
  check('display received state', !!(await d1.expect(m => m.type === 'state' && m.state.activeId === 'x')));
  const d2 = await open(`ws://127.0.0.1:${PORT}/room/${code}?role=display`);
  check('late joiner got last state', !!(await d2.expect(m => m.type === 'state' && m.state.activeId === 'x')));
  check('controller told 2 displays', !!(await ctrl.expect(m => m.type === 'clients' && m.n === 2)));
  d2.send(JSON.stringify({ type: 'state', state: { v: 1, activeId: 'evil' } }));
  check('display cannot push state', (await d1.expect(m => m.type === 'state' && m.state.activeId === 'evil', 800)) === null);
  ctrl.send('not json'); ctrl.send(JSON.stringify({ type: 'other' }));
  check('junk from controller is ignored', (await d1.expect(m => m.type !== 'state', 800)) === null);
  d1.close(); d2.close();
  check('controller told 0 displays after close', !!(await ctrl.expect(m => m.type === 'clients' && m.n === 0)));
  ctrl.close();
}
main().catch(e => { console.error('ERR', e); failed++; }).finally(() => { if (dev) dev.kill('SIGTERM'); setTimeout(() => process.exit(failed ? 1 : 0), 500); });
