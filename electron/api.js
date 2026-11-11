// HTTP API of the desktop app, for Stream Deck, Bitfocus Companion and other automation.
// Pure Node: no Electron import, so it can be tested without the desktop shell.
//
//   GET  /api              list the endpoints
//   GET  /api/state        the state last pushed to displays (no PIN; displays on the Wi-Fi see it anyway)
//   POST /api/<action>     play start pause reset next prev nudge blackout flash load message hideMessage
//                          PIN in an X-Pin header, ?pin=, or a JSON body { pin }.
//                          value in ?value= or a JSON body { value }; message takes ?text= (&color=, &bold=1 …) or { text, … }.
//                          Answers { ok: true } or { ok: false, reason } with 200, 400, 403, 429 or 504.
//
// Wrong PINs are counted across every client (HTTP and phone remotes): after LOCK_AFTER of them within
// WINDOW_MS, control is refused for the rest of the window. A four-digit PIN cannot be guessed at that rate.
const ACTIONS = ['play', 'start', 'pause', 'reset', 'next', 'prev', 'nudge', 'blackout', 'flash', 'load', 'message', 'hideMessage'];
const TIMEOUT_MS = 3000, MAX_BODY = 16 * 1024, LOCK_AFTER = 5, WINDOW_MS = 60 * 1000;
const flag = v => v === true || (typeof v === 'string' && /^(1|true|yes|on)$/i.test(v));

function createApi({ lastMessage, sendCommand, newClientId, now = Date.now }) {
  const pending = new Map();   // clientId -> { res, timer }
  let wrongPins = [];          // timestamps of refused PINs
  const headers = (extra = {}) => ({ 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, X-Pin', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Cache-Control': 'no-store', ...extra });
  const json = (res, code, body) => { res.writeHead(code, headers()); res.end(JSON.stringify(body)); };
  function noteWrongPin() { wrongPins.push(now()); }
  function lockedFor() {
    const t = now(); wrongPins = wrongPins.filter(x => t - x < WINDOW_MS);
    return wrongPins.length >= LOCK_AFTER ? Math.ceil((WINDOW_MS - (t - wrongPins[wrongPins.length - LOCK_AFTER])) / 1000) : 0;
  }
  const lockReason = secs => `Too many wrong PINs. Try again in ${secs} s.`;
  const readBody = req => new Promise(resolve => {
    let data = '', done = false;
    const finish = v => { if (!done) { done = true; resolve(v); } };
    req.on('data', c => { data += c; if (data.length > MAX_BODY) finish({ error: 'Body too large', code: 413 }); });
    req.on('end', () => {
      if (!data.trim()) return finish({ body: {} });
      try { const b = JSON.parse(data); finish({ body: b && typeof b === 'object' ? b : {} }); } catch (e) { finish({ error: 'Bad JSON', code: 400 }); }
    });
    req.on('error', () => finish({ error: 'Bad request', code: 400 }));
  });
  // The controller page answers through the same reply channel the phone remotes use.
  function reply(clientId, msg) {
    const p = pending.get(clientId); if (!p) return false;
    pending.delete(clientId); clearTimeout(p.timer);
    if (!msg.ok && msg.reason === 'Wrong PIN') noteWrongPin();
    json(p.res, msg.ok ? 200 : msg.reason === 'Wrong PIN' ? 403 : 400, { ok: !!msg.ok, ...(msg.ok ? {} : { reason: msg.reason || 'Refused' }) });
    return true;
  }
  async function handle(req, res) {
    const url = new URL(req.url, 'http://x');
    if (url.pathname !== '/api' && !url.pathname.startsWith('/api/')) return false;
    if (req.method === 'OPTIONS') { json(res, 204, {}); return true; }
    const action = url.pathname.replace(/^\/api\/?/, '');
    if (!action) { json(res, 200, { app: 'stage-clock', actions: ACTIONS, state: 'GET /api/state', pin: 'X-Pin header, ?pin= or JSON body { pin }', value: '?value= or JSON body { value }; message: ?text= or JSON body { text, color, bold, upper, flash }' }); return true; }
    if (action === 'state') {
      if (req.method !== 'GET') { json(res, 405, { ok: false, reason: 'GET only' }); return true; }
      const m = lastMessage(); if (!m) { json(res, 503, { ok: false, reason: 'No state yet' }); return true; }
      res.writeHead(200, headers()); res.end(m); return true;
    }
    if (!ACTIONS.includes(action)) { json(res, 404, { ok: false, reason: 'Unknown action', actions: ACTIONS }); return true; }
    if (req.method !== 'POST') { json(res, 405, { ok: false, reason: 'POST only' }); return true; }
    const secs = lockedFor(); if (secs) { json(res, 429, { ok: false, reason: lockReason(secs) }); return true; }
    const r = await readBody(req); if (r.error) { json(res, r.code, { ok: false, reason: r.error }); return true; }
    const body = r.body, q = k => url.searchParams.get(k);
    const pin = req.headers['x-pin'] ?? q('pin') ?? body.pin;
    let value = body.value !== undefined ? body.value : q('value');
    if (action === 'nudge') value = parseInt(value, 10) || 0;
    if (action === 'message') value = { text: body.text ?? q('text') ?? '', color: body.color ?? q('color') ?? undefined, bold: flag(body.bold ?? q('bold')), upper: flag(body.upper ?? q('upper')), flash: flag(body.flash ?? q('flash')) };
    const clientId = newClientId();
    const timer = setTimeout(() => { if (pending.delete(clientId)) json(res, 504, { ok: false, reason: 'The controller did not answer' }); }, TIMEOUT_MS);
    pending.set(clientId, { res, timer });
    sendCommand(clientId, { type: 'command', id: 'http-' + clientId, action, value, pin: pin === undefined || pin === null ? '' : String(pin) });
    return true;
  }
  return { handle, reply, noteWrongPin, lockedFor, lockReason, ACTIONS };
}
module.exports = { createApi, ACTIONS };
